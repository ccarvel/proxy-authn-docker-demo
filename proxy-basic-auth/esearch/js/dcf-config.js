

/*

  Essentially a pattern-matching declaration, that looks for a 
  pattern in the search conditions, and if the pattern is fulfilled,
  displays designated resources in the ContextFrame.

  Format:

    [
      { 
        searchRule: <SEARCH-RULE>, 
        resources: <RESOURCES>
      } 
      <... MORE RULES>
    ]

  Search rules are:

    For matching values:

    {
      ruleType: <one of: "matches", "equals">,
      fieldId: <string>,
      value: <string> (if it's a 'matches' rule, then this is a regular expression)
    }

    NOTE: Regular expressions need to do the "double backslash" for symbols, 
          e.g. whitespace = \\s (not \s)

    For "and"/"or":

    {
      ruleType: <either "and" or "or">,
      rules: [<two or more rules>]
    }

    You can defined what is shown in the initial state, before
    the user does anything -- this is done by:

    {
      ruleType: 'init'
    }

    You can also check if a filter is not empty:

    {
      ruleType: 'isNotEmpty',
      fieldId: <string>
    }


  Resources — what appears when the rule is TRUE?

    {
      tag: <either a single integer, or an array of integers>,
      category:  <either a single integer, or an array of integers>,
      id:  <either a single integer, or an array of integers>
    }

    You can use one or more of tag/category/id — these are combined together,
    so that we fetch the designated tags PLUS the designated categories PLUS the IDs. 
    (A current limitation is that you can't do complex category/tag combinations — 
    e.g. ask for items that has the tag "apple" but only if it's the category "fruit")
    
  See schema for this data structure at dcf-config_schema.json

  You can validate this config by putting the array (i.e. the code between "START/END RULE DATA") 
  and the schema into https://www.jsonschemavalidator.net/

*/



const rules = 

// START RULE DATA

[
  {
  	searchRule: {
	  	ruleType: 'init'
    },
    resourceSelector: {
    	id: 123
    }
  },
  {
  	searchRule: {
      ruleType: 'isNotEmpty',
      fieldId: 'filter.all_name'
    },
    resourceSelector: {
    	id: 125
    }
  },
  {
  	searchRule: {
    	ruleType: 'isNotEmpty',
		fieldId: 'filter.sex'
    },
    resourceSelector: {
    	id: 127
    }
  },
  {
  	searchRule: {
    	ruleType: 'isNotEmpty',
		fieldId: 'filter.all_races'
    },
    resourceSelector: {
    	id: 129
    }
  },
  {
  	searchRule: {
    	ruleType: 'isNotEmpty',
		fieldId: 'filter.reference_data.all_locations'
    },
    resourceSelector: {
    	id: 131
    }
  },
  {
  	searchRule: {
    	ruleType: 'isNotEmpty',
		fieldId: 'filter.all_tribes'
    },
    resourceSelector: {
    	id: 133
    }
  }
];

// END RULE DATA

// Add IDs to rules

const rulesWithIDs = rules.map(
  (rule, index) => Object.assign({}, rule, { id: index })
);

export default Object.freeze(rulesWithIDs);
