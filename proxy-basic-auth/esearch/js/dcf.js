
import dcfConfig from './dcf-config.js';
import { getDcfResources } from './dcf-resources.js';

/*

  This is the main module for generating the "DCF" = "Decolonizing Contextual Frame".
  The module exports a single initialization function for the DCF.

  This module converts the rules in the DCF-config file into "test functions"
  each of which accepts the state of the app and, if the test passes, 
  indicates which resources should be shown.

  While the HTML for each resource card (the ones that display on the RH side) is 
  generated in dcf-resources.js, that HTML is converted to DOM
  nodes and finalized with event handlers in this module.

*/

const parser = new DOMParser(),
      strToDom = str => parser.parseFromString(str, 'text/html').body.firstElementChild;

// Given a clause, generate test functions

const testFunctionFactories = {

  init: () => { // This is probably better tested by seeing if there are any other notes
    return () => false;
    // return data => data.isInitial()
  }, // The rule could always return true -- IF no other rules, THEN init()
     // maybe a better name is 'default'

  matches: ({fieldId, value}) => {
    const matchRegEx = new RegExp(value),
          matchTestFunc = dataValue => matchRegEx.test(dataValue),
          testFunc = data => data.getFieldValue(fieldId).some(matchTestFunc);
    return testFunc;
  },

  equals: ({fieldId, value}) => {
    const equalityTestFunc = dataValue => dataValue === value;
    return data => data.getFieldValue(fieldId).some(equalityTestFunc);
  },

  isNotEmpty: ({fieldId}) => {
    const isNotEmptyTestFunc = dataValue => {
      return dataValue !== undefined && dataValue.trim() !== ''
    }
    return data => data.getFieldValue(fieldId).some(isNotEmptyTestFunc);
  },

  and: ({rules}) => {
    const rulesAsFunctions = rules.map(rule => getTestFunction(rule));
    return data => rulesAsFunctions.every(f => f(data));
  },

  or: ({rules}) => {
    const rulesAsFunctions = rules.map(rule => getTestFunction(rule));
    return data => rulesAsFunctions.some(f => f(data));
  }
}

function getTestFunction({ruleType, ...ruleArguments}) {
  if (testFunctionFactories[ruleType] === undefined) {
    console.error(`'${ruleType}' is not a recognized test type (i.e. ${Object.keys(testFunctionFactories).join(', ')} -- case matters!)`);
  } else {
    return testFunctionFactories[ruleType](ruleArguments);
  }
}

function getFootnoteHtmlElem(resource) {
  const footnoteElem = document.createElement('span');
  footnoteElem.classList.add('cf-footnote');
  footnoteElem.innerText = resource.id;
  footnoteElem.onmouseover = () => {
    document.getElementById(`dcf-resource-${resource.id}`).classList.add('highlight');
  }
  footnoteElem.onmouseleave = () => {
    document.getElementById(`dcf-resource-${resource.id}`).classList.remove('highlight');
  }
  return footnoteElem;
}

// Given a collapsible element that has DCF content,
//  set up local storage to remember its collapse state

function initializeDcfShowHideHandler(dcfCollapsibleContentElem) {

  const collapsingChildElem = dcfCollapsibleContentElem.children[1],
        wasPreviouslyCollapsed = sessionStorage.getItem(dcfCollapsibleContentElem.id) === 'hide';

  // If set to true then hide

  if (wasPreviouslyCollapsed) {
    collapsingChildElem.classList.remove('show');
  }

  // @todo When we upgrade to Bootstrap 5, we can use VanillaJS
  //  to set *.bs.collapse event handling 

  $(dcfCollapsibleContentElem).on('shown.bs.collapse', function () {
    sessionStorage.setItem(dcfCollapsibleContentElem.id, 'show');
  });

  $(dcfCollapsibleContentElem).on('hidden.bs.collapse', function () {
    sessionStorage.setItem(dcfCollapsibleContentElem.id, 'hide');
  });
  return dcfCollapsibleContentElem;
}

function getDcfUpdateHandler(searchState, dcfContentElem, table) {

  // Map rules array (from config) to an array of objects with
  //  test-functions and resolved resources

  const rules = dcfConfig.map(rule => {

    // Get this rule's corresponding test function
    const testFunction = getTestFunction(rule.searchRule);

    // Create a function for testing an entry
    const entryPassesFunction = entry => {
      return testFunction({
        getFieldValue: (fieldId) => [entry[fieldId.slice(7)]],
        isInitial: () => false // Entries are never init
      })
    };

    // Create a function for testing filter state
    const filterPassesFunction = () => testFunction(searchState);

    // START TEMP -- so that the initial rule can be shown
    //   before the data is loaded. @todo fix this
    if (rule.searchRule.ruleType === 'init') {
      console.log({
        type: rule.searchRule.ruleType,
        filterPasses: filterPassesFunction,
        entryPasses: entryPassesFunction,
        resources: getDcfResources(rule.resourceSelector),
        resourceSelector: rule.resourceSelector
      });
    } // END TEMP
    return {
      type: rule.searchRule.ruleType,
      filterPasses: filterPassesFunction,
      entryPasses: entryPassesFunction,
      resources: getDcfResources(rule.resourceSelector)
    }
  });

  // Pull out the default rule (only the first is used)

  const defaultRule = rules.find(rule => rule.type === 'init');

  // Define a function to deduplicate an array
  //  (used below)

  const filterForUniques = (resource, index, resources) => {
    return resources.findIndex(r => r.id === resource.id) === index
  }
  
  //window.srGetTestFunction = getTestFunction;
  //window.srRules = rules;

  // Final function: run test functions against filters and records and
  //  update the display accordingly

  return function () {

    // Generate the footnotes in the table

    // For each results entry in the table 
    //  (1) run the tests and get a list of rules that apply
    //  (2) extract the resources into a list
    //  (3) deduplicate the list
    //  (4) convert the list to HTML strings and join

    table.getVisibleData().forEach(entry => {
      const entryFootnoteElemId = `referent-footnote-id-${entry.referent_db_id}`,
            entryFootnoteContainerElem = document.getElementById(entryFootnoteElemId);

      if (entryFootnoteContainerElem.innerHTML.trim() === '') {
        rules.filter(rule => rule.entryPasses(entry)) // 1
            .reduce((resources, rule) => resources.concat(rule.resources), []) // 2
            .filter(filterForUniques) // 3
            .map(resource => getFootnoteHtmlElem(resource)) // 4
            .forEach(
              entryFootnoteElem => entryFootnoteContainerElem.appendChild(entryFootnoteElem)
            );
      }
    });

    // Generate the sidebar content

    searchState.refreshFilterValues();

    // For each rule, run the tests against the filter state
    // (if none pass, then use the default rule)

    const cfRulesThatPass = rules.filter(rule => rule.filterPasses()), // (1)
          cfRules = cfRulesThatPass.length ? cfRulesThatPass : [defaultRule];

    // From the passed rules, get the list of associated cfResources and deduplicate

    const cfResources = cfRules.reduce((resources, rule) => resources.concat(rule.resources), []) // (2)
                               .filter(filterForUniques);

    // Get the list of IDs of the cfResources that are currently displayed in the DOM

    const cfIDsAlreadyDisplayed = Array.from(dcfContentElem.children).map(x => x.id);
    
    // Add cfResources to DOM if they're not already displaying
    
    const isNotDisplayed = r => ! cfIDsAlreadyDisplayed.includes(`dcf-resource-${r.id}`);
    cfResources.filter(r => isNotDisplayed(r)) // Filter for not-displayed
        .map(resource => strToDom(resource.cfHtml)) // Convert to DOM Element
        .map(initializeDcfShowHideHandler)
        .forEach(resourceElem => dcfContentElem.appendChild(resourceElem)); // Append to DOM

    // Remove displayed cfResources from DOM if they no longer apply with these rules

    const cfResourcesIds = cfResources.map(r => `dcf-resource-${r.id}`);
    cfIDsAlreadyDisplayed.filter(cfId => ! cfResourcesIds.includes(cfId))
        .forEach(cfId => document.getElementById(cfId).remove());
  }
}

export { getDcfUpdateHandler }
