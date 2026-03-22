import { fetchHoldings } from "./src/lib/portfolio";
async function test() {
  const data = await fetchHoldings();
  console.log(data);
}
test();
