/*
 Simple Programming Language 'Egg'

 All elements in Egg are expressions consisting of a variable, 
 number, string, or application (used for function calls and constructs for loops)

 Parser will be not allow backslash escapes
 Strings cannot include double quotes inside
 Numbers are a sequence of digits
 Variable names are any character except whitespaces and has no special meaning
 Applications are similar to JS function syntax using parentheses and commas between arguments

 example of code
 do( define(x, 10),
     if( >(x, 5),
         print("large"),
         print("small") ))

 Value expressions represent literal string or number values using their 'value' property
 Word expressions are used for identifiers using the 'name' property
 Apply expressions are the applications with an 'operator' property refering to
 the expression being applied as well as an 'args' property with the arguments

 example of >(x, 5) would be represented as
 
  {
    type: "apply",
    operator: {type: "word", name: ">"},
    args: [
        {type: "word", name: "x"}
        {type: "value", value: 5}
    ]
  }
  
*/

// Find out what type of expression and create expr object with those properties otherwise throw a syntax error
function parseExpression(program) {
  program = skipSpace(program);
  var match, expr;
  if (match = /^"([^"]*)"/.exec(program)) // matches surrounded double quotes : "string"
    expr = {type: "value", value: match[1]}; // create object with type 'value' and value with first match argument
  else if (match = /^\d+\b/.exec(program))  // matches number : 23423
    expr = {type: "value", value: Number(match[0])}; // create 'value' object with value number of match (uses start of string and \b)
  else if (match = /^[^\s(),"]+/.exec(program))  // matches identifying words (anything but white character, parentheses, comma, or quotes)
    expr = {type: "word", name: match[0]};
  else
    throw new SyntaxError("Unexected syntax: " + program);
    
  return parseApply(expr, program.slice(match[0].length));
}

// Cut off any whitespace elements before the program string
function skipSpace(string) {
  var first = string.search(/\S/);
  if (first == -1) return "";
  return string.slice(first);
}

// Used in along with parseExpression to add arguments to an expression   
function parseApply(expr, program) {
  // if this expression is not an application
  program = skipSpace(program);
  if (program[0] != "(")
    return {expr: expr, rest: program};
  
  // skip opening parentheses and add remaining expressions as arguments
  // until closing parentheses is found then keep parseing
  program = skipSpace(program.slice(1));
  expr = {type: "apply", operator: expr, args: []};
  while (program[0] != ")") {
    var arg = parseExpression(program);
    expr.args.push(arg.expr);
    program = skipSpace(arg.rest);
    if (program[0] == ",")
      program = skipSpace(program.slice(1));
    else if (program[0] != ")")
      throw new SyntaxError("Expected ',' or ')'");
  }
  // need to check if another pair of parentheses follows apply expression
  return parseApply(expr, program.slice(1));
}

// Verify the end of input is reached properly returning an expression consisting of the program
function parse(program) {
  var result = parseExpression(program);
  if (skipSpace(result.rest).length > 0)
    throw new SyntaxError("Unexpected text after program");
  return result.expr;
}

// Keep in mind for debugging purposes there is little information given in errors
// including the lack of line and column of error found

/*
Test parseing input

console.log(parse("+(a, 10)"));

{ type: 'apply',                                                                                                                                                 
  operator: { type: 'word', name: '+' },                                                                                                                    
  args: [ { type: 'word', name: 'a' }, { type: 'value', value: 10 } ] }

*/