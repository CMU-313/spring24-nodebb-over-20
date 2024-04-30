const Iroh = require("iroh");

let stage = new Iroh.Stage(`
function sampleFunction() {
  console.log("This is a sample function.");
}
Function.prototype.toString.call(sampleFunction);
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
