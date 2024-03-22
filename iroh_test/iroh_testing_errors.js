const Iroh = require("iroh");

function stage(n) {
  function factorial(num) {
    if (num === 0) {
      return 1;
    } else {
      return num * factorial(num - 1);
    }
  }
  
  return factorial(n);
}

// function call
Iroh.addListener(Iroh.CALL)
.on("before", (e) => {
  let external = e.external ? "#external" : "";
  console.log(" ".repeat(e.indent) + "call", e.name, external, "(", e.arguments, ")");
})
.on("after", (e) => {
  let external = e.external ? "#external" : "";
  console.log(" ".repeat(e.indent) + "call", e.name, "end", external, "->", [e.return]);
});

// function
Iroh.addListener(Iroh.FUNCTION)
.on("enter", (e) => {
  let sloppy = e.sloppy ? "#sloppy" : "";
  if (e.sloppy) {
    console.log(" ".repeat(e.indent) + "call", e.name, sloppy, "(", e.arguments, ")");
  }
})
.on("leave", (e) => {
  let sloppy = e.sloppy ? "#sloppy" : "";
  if (e.sloppy) {
    console.log(" ".repeat(e.indent) + "call", e.name, "end", sloppy, "->", [e.return]);
  }
})
.on("return", (e) => {
  let sloppy = e.sloppy ? "#sloppy" : "";
  if (e.sloppy) {
    console.log(" ".repeat(e.indent) + "call", e.name, "end", sloppy, "->", [e.return]);
  }
});

// program
Iroh.addListener(Iroh.PROGRAM)
.on("enter", (e) => {
  console.log(" ".repeat(e.indent) + "Program");
})
.on("leave", (e) => {
  console.log(" ".repeat(e.indent) + "Program end", "->", e.return);
});

// Execute the function without patching
console.log("Testing stage function without patching:");
console.log("Result:", stage(5));
