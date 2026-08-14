export default function decorate(block) {
  [...block.children].forEach((row) => {
    row.classList.add('accordion-item');
    const [label, body] = row.children;
    body?.classList.add('accordion-item-body');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'accordion-item-label';
    button.setAttribute('aria-expanded', 'false');
    while (label?.firstChild) button.append(label.firstChild);
    label?.replaceWith(button);

    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      row.classList.toggle('accordion-item-expanded', !expanded);
    });
  });
}
