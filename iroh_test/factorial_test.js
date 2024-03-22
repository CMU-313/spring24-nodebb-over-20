const Iroh = require("iroh");

let stage = new Iroh.Stage(`
function calculateFactorial(n) {
  if (n === 0 || n === 1) {
    return 1;
  } else {
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  }
};
calculateFactorial(5);
`);

// function
stage.addListener(Iroh.FUNCTION)
.on("enter", (e) => {
  console.log(" ".repeat(e.indent) + "enter", e.name, "(", e.arguments, ")");
})
.on("leave", (e) => {
  console.log(" ".repeat(e.indent) + "leave", e.name, "->", [e.return]);
});

// program
stage.addListener(Iroh.PROGRAM)
.on("enter", (e) => {
  console.log(" ".repeat(e.indent) + "Program");
})
.on("leave", (e) => {
  console.log(" ".repeat(e.indent) + "Program end", "->", e.return);
});

eval(stage.script);
