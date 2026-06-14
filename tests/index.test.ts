import { main } from "../src";

test("exports the ix-flow CLI entrypoint", () => {
  expect(typeof main).toBe("function");
});
