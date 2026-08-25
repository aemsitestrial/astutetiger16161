import { createOptimizedPicture } from '../../scripts/aem.js';

/* eslint-disable */
export function decorateButtons(...buttons) {
  return buttons
    .map((div) => {
      const a = div.querySelector('a');
      if (a) {
        a.classList.add('button');
        if (a.parentElement.tagName === 'EM') a.classList.add('secondary');
        if (a.parentElement.tagName === 'STRONG') a.classList.add('primary');
        return a.outerHTML;
      }
      return '';
    })
    .join('');
}

export function generateTeaserDOM(props, classes) {
  // Extract properties, always same order as in model, empty string if not set
  const [pictureContainer, eyebrow, title, longDescr, shortDescr, firstCta, secondCta] = props;
  const picture = pictureContainer.querySelector('picture');
  if (picture) {
    const pictureSrc = picture.querySelector('img').src;
    const optimizedPicture = createOptimizedPicture(pictureSrc, '', false, [{ width: '1360' }]);
    pictureContainer.textContent = '';
    pictureContainer.appendChild(optimizedPicture);
  }
  const hasShortDescr = shortDescr.textContent.trim() !== '';
  // Build DOM
  const teaserDOM = document.createRange().createContextualFragment(`
    <div class='background'>${picture ? picture.outerHTML : ''}</div>
    <div class='foreground'>
      <div class='text'>
        ${
  eyebrow.textContent.trim() !== ''
    ? `<div class='eyebrow'>${eyebrow.textContent.trim().toUpperCase()}</div>`
    : ``
}
        <div class='title'>${title.innerHTML}</div>
        <div class='long-description'>${longDescr.innerHTML}</div>
        <div class='short-description'>${hasShortDescr ? shortDescr.innerHTML : ''}</div>
        <div class='cta'>${decorateButtons(firstCta, secondCta)}</div>
      </div>
      </div>
    </div>
  `);

  // set the mobile background color
  const backgroundColor = [...classes].find((cls) => cls.startsWith('bg-'));
  if (backgroundColor) {
    teaserDOM
      .querySelector('.foreground')
      .style.setProperty('--teaser-background-color', `var(--${backgroundColor.substr(3)})`);
  }

  // add final teaser DOM and classes if used as child component
  return teaserDOM;
}

/**
 * Applies an Adobe Target personalization payload (as received via the
 * `target:content` CustomEvent) onto a decorated teaser: `name` maps to the
 * teaser's heading, `description` maps to the teaser's short description.
 * @param {HTMLElement} root the decorated teaser DOM (block or fragment)
 * @param {Object} content the personalized JSON content-item payload
 */
export function applyTargetPersonalization(root, content = {}) {
  const { name, description } = content;
  if (name) {
    const heading = root.querySelector('.title h1, .title h2, .title h3, .title h4, .title h5, .title h6')
      || root.querySelector('.title');
    if (heading) heading.textContent = name;
  }
  if (description) {
    const shortDescription = root.querySelector('.short-description');
    if (shortDescription) shortDescription.textContent = description;
  }
}

export default function decorate(block) {
  // get the first and only cell from each row
  const props = [...block.children].map((row) => row.firstElementChild);
  const teaserDOM = generateTeaserDOM(props, block.classList);
  block.textContent = '';
  block.append(teaserDOM);
  // pick up Adobe Target JSON personalization (name -> heading, description -> short description)
  block.addEventListener('target:content', (e) => applyTargetPersonalization(block, e.detail));
}
