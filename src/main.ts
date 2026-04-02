import {greet} from "cjs-dependency";

// Only reached if the bug is fixed
document.querySelector<HTMLDivElement>("#app")!.textContent = greet();
