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

// Looks for anything other then whitespace and starts string at that point
/*
function skipSpace(string) {
  var first = string.search(/\S/);
  if (first == -1) return "";
  return string.slice(first);
}
*/

// Looks for whitespace or a comment and starts string afterwards
function skipSpace(string) {
  var toSkip = string.match(/(\s|#.*)*/);
  if (toSkip == -1) return "";
  return string.slice(toSkip[0].length);
}

/* Comment Test
console.log(parse("# hello\nx"));
 → { type: 'word', name: 'x' }
console.log(parse("a # one\n    # two \n()"));
 → { type: 'apply',
  operator: { type: 'word', name: 'a' },
  args: [] }
*/

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

// Evaluator will run syntax tree of program using an environment object to associated names with
// values. It will evaluate the expression and return the appropriate value

function evaluate(expr, env) {
  switch(expr.type) {
    case "value":
      return expr.value;
      
    case "word":
      if (expr.name in env)
        return env[expr.name];
      else
        throw new ReferenceError("Undefined variable: " + expr.name);
    
    // if operator is in a special form (if) pass the argument expression with the environment
    // operator can also be normal form (normal function) which is verified and called the same as special form operators
    case "apply":
      if (expr.operator.type == "word" && expr.operator.name in specialForms)
        return specialForms[expr.operator.name](expr.args, env);
      var op = evaluate(expr.operator, env);
      if (typeof op != "function")
        throw new TypeError("Applying a non-function.");
      return op.apply(null, expr.args.map(function(arg) {
        return evaluate(arg, env);
      }));
  }
}

// specialForms object will be used to define the syntax of Egg
// associating words with functions evaluating such special forms

var specialForms = Object.create(null);

// if construct expects 3 arguments
// first is if statement itself then two paths
// will follow first path if evaluated to true and second if false
// only handles false boolean
// similar to JS ?: operator
specialForms["if"] = function (args, env) {
  if (args.length != 3)
    throw new SyntaxError("Bad number of args to if");
    
  if (evaluate(args[0], env) !== false)
    return evaluate(args[1], env);
  else
    return evaluate(args[2], env);
};

// while construct similar to if
// expects 2 arguments
specialForms["while"] = function(args, env) {
  if (args.length != 2)
    throw new SyntaxError("Bad number of args to while");
  
  while (evaluate(args[0], env) !== false)
    evaluate(args[1], env);
    
  // Since undefined does not exist, return false for lack of meaningful result
  return false;
};

// do construct will execute all arguments inline
// will return value produced by last argument
specialForms["do"] = function(args, env) {
  var value = false;
  args.forEach(function(arg) {
    value = evaluate(arg, env);
  });
  return value;
};

// define construct will allow variable construction
// expects a word as first argument and expression evaluating to a value for that word as second
// will return assigned value
specialForms["define"] = function(args, env) {
  if (args.length != 2 || args[0].type != "word")
    throw new SyntaxError("Bad use of define");
  var value = evaluate(args[1], env);
  env[args[0].name] = value;
  return value;
};

// Enviroment object will represent the scope of the program
// containing variable and function names with their values

var topEnv = Object.create(null);

// boolean values
topEnv["true"] = true;
topEnv["false"] = false;

/* Boolean test

var prog = parse("if(true, false, true)");
console.log(evaluate(prog, topEnv));
→ false

*/

// use new Function to synthesize basic arithmetic and comparison operators
["+", "-", "*", "/", "==", "<", ">"].forEach(function(op) {
  topEnv[op] = new Function("a, b", "return a " + op + " b;");
});

// simlar to python, use print to output values
topEnv["print"] = function(value) {
  console.log(value);
  return value;
};

// run function provides a way to write and run program using a fresh environment
// parses and evaluates strings as a single program
// unlike normal functions we do not know how many arguments it will receive
// using arguments word to represent them and Array.prototype.slice.call to turn
// argurments object into array then join them with newline characters
function run() {
  var env = Object.create(topEnv);
  var program = Array.prototype.slice.call(arguments, 0).join("\n");
  return evaluate(parse(program), env);
}

/* Test program
     computes the sum of the numbers 1 to 10

run("do(define(total,0),",
    "   define(count, 1),",
    "   while(<(count,11),",
    "         do(define(total, +(total, count)),",
    "            define(count, +(count, 1)))),",
    "   print(total))");
→ 55

*/

// function construct creates it's own local environment building on the global scope
// then evalutes the fuction body and returns result
specialForms["fun"] = function(args, env) {
  if (!args.length)
    throw new SyntaxError("Functions need a body");
  // inside function used to map argument by name
  function name(expr) {
    if (expr.type != "word")
      throw new SyntaxError("Arg names must be words");
    return expr.name;
  }
  // split up args into names and the body of the function
  var argNames = args.slice(0, args.length - 1).map(name);
  var body = args[args.length - 1];
  
  return function() {
    if (arguments.length != argNames.length)
      throw new TypeError("Wrong number of arguments");
    // create a new localEnv variable containing the environment passed to the function
    // this localEnv will have all the topEnv properties as well the any properties
    // created as arugments for calling the and adds it's own arguments to localEnv
    // this allows us to not only use the arguments by adding them to the environment passed
    // to the evaluate call but also any variables in the scope of this function
    var localEnv = Object.create(env);
    for (var i = 0; i < arguments.length; i++)
      localEnv[argNames[i]] = arguments[i];
    return evaluate(body, localEnv);
  };
};

/*  Test function add 1 to number
run("do(define(plusOne, fun(a, +(a, 1))),",
    "   print(plusOne(10)))");
→ 11

    Exponent function (recursive)
run("do(define(pow, fun(base, exp,",
    "       if(==(exp, 0),",
    "         1,", // ← return 1
    "         *(base, pow(base, -(exp, 1)))))),",
    "   print(pow(2,10)))");
→ 1024

    Example of proper scope for functions
    function f returns another function that uses an f local variable to
    calcuate the sum demonstrating the inside function can access it's calling
    functions scope
run("do(define(f, fun(a, fun(b, +(a, b)))),",
    "   print(f(4)(5)))");
 → 9
*/

// Add support for arrays by using JS Array
// include length and element functions
topEnv["array"] = function() {
  var arr = Array.prototype.slice.call(arguments, 0);
  return arr;
};

topEnv["length"] = function(arr) {
  return arr.length;
};

topEnv["element"] = function(arr, elm) {
  return arr[elm];
};

/* Array Test
run("do(define(sum, fun(array,",
    "     do(define(i, 0),",
    "        define(sum, 0),",
    "        while(<(i, length(array)),",
    "          do(define(sum, +(sum, element(array, i))),",
    "             define(i, +(i, 1)))),",
    "        sum))),",
    "   print(sum(array(1, 2, 3))))");
 → 6 
*/

// since our only way of using variables is 'define' which creates a variable
// in the current scope, we cannot change nonlocal variables
// this set form checks through all scopes for the argument variable
// sets it's value if found or throws ReferenceError
specialForms["set"] = function(args, env) {
  if (args.length != 2 || args[0].type != "word")
    throw new SyntaxError("Bad use of set");
  var toSet = args[0].name;
  var val = evaluate(args[1], env);
  while (Object.getPrototypeOf(env) != null) {
    if (Object.hasOwnProperty.call(env, toSet)) {
      env[toSet] = val;
      return val;
    }
    env = Object.getPrototypeOf(env);
  }
  throw new ReferenceError("Unknown variable: " + toSet);
};

/* Set test
run("do( define(x, 4),",
    "    define(setx, fun(val, set(x, val))),",
    "    setx(50),",
    "    print(x)   )");
 → 50

run("set(quux, true)");
 → Some kind of ReferenceError
*/