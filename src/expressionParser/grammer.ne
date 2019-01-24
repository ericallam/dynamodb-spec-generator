@{%
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
%}

@lexer lexer

expression ->
    _ condition _
  | _ condition _ conjunction _ condition {% extractExpression %}

condition ->
  (comparisonCondition | functionCondition) {% extractCondition %}

comparisonCondition ->
  attributeName _ %operator _ attributeValue {% extractComparison %}

functionCondition ->
    _ attributeName _ %between _ attributeValue _ conjunction _ attributeValue {% extractBetween %}
  | _ %begins_with %lparen _ attributeName _ %comma _ attributeValue _ %rparen {% extractBeginsWith %}

attributeName -> %attributeName
attributeValue -> %attributeValue

conjunction -> %conjunction {% function(d) { return null; } %}

_ -> null | %ws {% function(d) { return null; } %}

@{%
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
%}