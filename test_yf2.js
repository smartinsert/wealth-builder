const yf = require("yahoo-finance2").default;
console.log(typeof yf);
// try to call quote
let instance;
try {
  instance = new yf();
} catch(e) {
  instance = yf;
}
console.log("instance quote type:", typeof instance.quote);
