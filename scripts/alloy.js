/* eslint-disable no-underscore-dangle */
import { loadScript, getMetadata } from './aem.js';

// TODO: set the Adobe Experience Platform Web SDK (alloy.js) version to load from Adobe's CDN
const ALLOY_VERSION = '2.19.1';
const ALLOY_SRC = `https://cdn1.adoberesources.net/alloy/${ALLOY_VERSION}/alloy.min.js`;

// TODO: set the IMS Organization ID
const ORG_ID = '0CEB60F754C7E06B0A4C98A2@AdobeOrg';
// TODO: set the Edge configuration / datastream ID (formerly edgeConfigId)
const DATASTREAM_ID = 'd7e718aa-3cf8-429f-bc60-9921cdbed6cc';

/**
 * Loads and configures the Adobe Experience Platform Web SDK (alloy.js) from Adobe's CDN.
 * @param {string} src the alloy.js library URL
 * @param {Object} config the alloy configure() payload
 * @returns {Promise} resolves once alloy has been configured
 */
function initWebSDK(src, config) {
  // Preparing the alloy queue
  if (!window.alloy) {
    window.__alloyNS = window.__alloyNS || [];
    window.__alloyNS.push('alloy');
    window.alloy = (...args) => new Promise((resolve, reject) => {
      window.setTimeout(() => {
        window.alloy.q.push([resolve, reject, args]);
      });
    });
    window.alloy.q = [];
  }
  // Loading and configuring the websdk
  return loadScript(src, { async: true })
    .then(() => window.alloy('configure', config));
}

/**
 * Invokes the given function once blocks/sections have been decorated,
 * and again whenever new ones get decorated afterwards.
 * @param {Function} fn the function to invoke
 */
function onDecoratedElement(fn) {
  // Apply propositions to all already decorated blocks/sections
  if (document.querySelector('[data-block-status="loaded"],[data-section-status="loaded"]')) {
    fn();
  }

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((m) => m.target.tagName === 'BODY'
      || m.target.dataset.sectionStatus === 'loaded'
      || m.target.dataset.blockStatus === 'loaded')) {
      fn();
    }
  });
  // Watch sections and blocks being decorated async
  observer.observe(document.querySelector('main'), {
    subtree: true,
    attributes: true,
    attributeFilter: ['data-block-status', 'data-section-status'],
  });
  // Watch anything else added to the body
  observer.observe(document.querySelector('body'), { childList: true });
}

function toCssSelector(selector) {
  return selector.replace(/(\.\S+)?:eq\((\d+)\)/g, (_, clss, i) => `:nth-child(${Number(i) + 1}${clss ? ` of ${clss})` : ''}`);
}

async function getElementForProposition(proposition) {
  const selector = proposition.data.prehidingSelector
    || toCssSelector(proposition.data.selector);
  return document.querySelector(selector);
}

const JSON_CONTENT_ITEM_SCHEMA = 'https://ns.adobe.com/personalization/json-content-item';

/**
 * Applies Target JSON content-item personalization by dispatching a `target:content`
 * CustomEvent (with the personalized JSON payload as detail) on the matching element,
 * so blocks can opt in to rendering their own personalized content.
 */
async function applyJsonContentPropositions(propositions) {
  propositions.forEach((p) => {
    p.items.forEach(async (item) => {
      if (item.schema !== JSON_CONTENT_ITEM_SCHEMA) return;
      const el = await getElementForProposition(item);
      if (el) {
        el.dispatchEvent(new CustomEvent('target:content', { detail: item.data.content }));
      }
    });
  });
}

/**
 * Requests Target decisions and applies them once the target elements are decorated.
 */
async function getAndApplyRenderDecisions() {
  // Get the decisions, but don't render them automatically
  // so we can hook up into the AEM EDS page load sequence
  const response = await window.alloy('sendEvent', { renderDecisions: true });
  const { propositions } = response;
  onDecoratedElement(async () => {
    await window.alloy('applyPropositions', { propositions });
    await applyJsonContentPropositions(propositions);
    // keep track of propositions that were applied
    propositions.forEach((p) => {
      p.items = p.items.filter((i) => i.schema !== 'https://ns.adobe.com/personalization/dom-action' || !getElementForProposition(i));
    });
  });

  // Reporting is deferred to avoid long tasks
  window.setTimeout(() => {
    // Report shown decisions
    window.alloy('sendEvent', {
      xdm: {
        eventType: 'decisioning.propositionDisplay',
        _experience: {
          decisioning: { propositions },
        },
      },
    });
  });
}

// Kicks off alloy.js loading/configuration as soon as this module is imported
const alloyLoadedPromise = initWebSDK(ALLOY_SRC, {
  datastreamId: DATASTREAM_ID,
  orgId: ORG_ID,
  // TODO: hook up to a real consent management system; defaulting to opted-in for now
  defaultConsent: 'in',
});

// Gate Target rendering behind page metadata so the overhead only applies to targeted pages
if (getMetadata('target')) {
  alloyLoadedPromise.then(() => getAndApplyRenderDecisions());
}

export default alloyLoadedPromise;
