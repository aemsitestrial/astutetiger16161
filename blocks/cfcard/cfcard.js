/* eslint-disable no-underscore-dangle */
export default function decorate(block) {
  const cfpath = block.querySelector(':scope div:nth-child(1) > div a')?.innerHTML.trim() || '';
  // the variation column is populated by the aem-content-fragment field's variationName picker
  let variationname = 'main';
  const variationElem = block.querySelector(':scope div:nth-child(2) > div > p');
  if (variationElem && variationElem.innerHTML) {
    variationname = variationElem.innerHTML.trim();
  }

  const itemId = `urn:aemconnection:${cfpath}/jcr:content/data/master`;

  block.innerHTML = `
  <div class='cfcard-content' data-aue-resource=${itemId} data-aue-label="card content fragment" data-aue-type="reference" data-aue-filter="cf">
      <div class='cfcard-body'>
          <p class='cfcard-path'>Content Fragment: ${cfpath}</p>
          <p class='cfcard-variation'>Variation: ${variationname}</p>
      </div>
  </div>
`;
}
