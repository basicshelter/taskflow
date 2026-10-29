import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compileString } from "sass";
import { describe, expect, it } from "vitest";

const stylesheet = compileString(
  readFileSync(resolve(process.cwd(), "app/home.module.scss"), "utf8"),
).css;

describe("task card styles", () => {
  it("keeps tasks aligned to the top of each column", () => {
    const taskListStyles = stylesheet.match(
      /\.boardColumn \.taskList \{([^}]*)\}/,
    )?.[1];

    expect(taskListStyles).toContain("align-content: start");
  });

  it("keeps cards compact and clamps overflowing descriptions", () => {
    const cardStyles = stylesheet.match(/\.taskCard \{([^}]*)\}/)?.[1];
    const descriptionStyles = stylesheet.match(/\.taskCard p \{([^}]*)\}/)?.[1];

    expect(cardStyles).toContain("height: 82px");
    expect(cardStyles).toContain("overflow: hidden");
    expect(descriptionStyles).toContain("-webkit-line-clamp: 2");
    expect(descriptionStyles).toContain("overflow: hidden");
  });
});
