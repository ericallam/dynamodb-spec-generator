// Generated automatically by nearley, version 2.16.0
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

  const lo = require("lodash");
  const moo = require('moo');
  const lexer = moo.compile({ 
    ws: /[ \t]+/, 
    attributeValue: /:[A-Za-z0-9]+/, 
    attributeName: /#[A-Za-z0-9]+/, 
    operator: ['>=', '<=', '>', '<', '='],
    conjunction: ["AND"],
    between: "BETWEEN",
    begins_with: "begins_with",
    lparen: "(",
    rparen: ")",
    comma: ","
  })


  function extractExpression(d) {
    const cleanedData = lo.flatten(lo.compact(d));

    return cleanedData;
  }

  function extractCondition(d) {
    const cleanedData = lo.flatten(lo.compact(d));

    return cleanedData;
  }

  function extractComparison(d) {
    const cleanedData = lo.compact(d);
    
    return {
      attributeName: cleanedData[0][0].value,
      operator: cleanedData[1].value,
      attributeValue: cleanedData[2][0].value
    }
  }

  function extractBetween(d) {
    const cleanedData = lo.compact(d);

    return {
      operator: 'between',
      attributeName: cleanedData[0][0].value,
      attributeMinValue: cleanedData[2][0].value,
      attributeMaxValue: cleanedData[4][0].value
    }
  }

  function extractBeginsWith(d) {
    const cleanedData = lo.flatten(lo.compact(d));

    const attributeName = lo.find(cleanedData, token => token.type === "attributeName");
    const attributeValue = lo.find(cleanedData, token => token.type === "attributeValue");

    return {
      operator: 'begins_with',
      attributeName: attributeName.value,
      attributeValue: attributeValue.value
    }
  }
var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "expression", "symbols": ["_", "condition", "_"]},
    {"name": "expression", "symbols": ["_", "condition", "_", "conjunction", "_", "condition"], "postprocess": extractExpression},
    {"name": "condition$subexpression$1", "symbols": ["comparisonCondition"]},
    {"name": "condition$subexpression$1", "symbols": ["functionCondition"]},
    {"name": "condition", "symbols": ["condition$subexpression$1"], "postprocess": extractCondition},
    {"name": "comparisonCondition", "symbols": ["attributeName", "_", (lexer.has("operator") ? {type: "operator"} : operator), "_", "attributeValue"], "postprocess": extractComparison},
    {"name": "functionCondition", "symbols": ["_", "attributeName", "_", (lexer.has("between") ? {type: "between"} : between), "_", "attributeValue", "_", "conjunction", "_", "attributeValue"], "postprocess": extractBetween},
    {"name": "functionCondition", "symbols": ["_", (lexer.has("begins_with") ? {type: "begins_with"} : begins_with), (lexer.has("lparen") ? {type: "lparen"} : lparen), "_", "attributeName", "_", (lexer.has("comma") ? {type: "comma"} : comma), "_", "attributeValue", "_", (lexer.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": extractBeginsWith},
    {"name": "attributeName", "symbols": [(lexer.has("attributeName") ? {type: "attributeName"} : attributeName)]},
    {"name": "attributeValue", "symbols": [(lexer.has("attributeValue") ? {type: "attributeValue"} : attributeValue)]},
    {"name": "conjunction", "symbols": [(lexer.has("conjunction") ? {type: "conjunction"} : conjunction)], "postprocess": function(d) { return null; }},
    {"name": "_", "symbols": []},
    {"name": "_", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": function(d) { return null; }}
]
  , ParserStart: "expression"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
