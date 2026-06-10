import { describe, it, expect } from "vitest";
import {
  EVENT_CLASSIFICATION,
  classifyEvent,
  shouldReplicate,
  isWorld,
} from "../game/net/eventClassification";

describe("eventClassification", () => {
  it("classifies pickup as world+private", () => {
    expect(classifyEvent("item:pickedUp")).toEqual(["world", "private"]);
  });
  it("dialog never crosses the wire", () => {
    expect(shouldReplicate("dialog:triggered")).toBe(false);
  });
  it("player:moved is presence", () => {
    expect(shouldReplicate("player:moved")).toBe(true);
    expect(isWorld("player:moved")).toBe(false);
  });
  it("net events are private (never replicated)", () => {
    expect(shouldReplicate("net:playerJoined")).toBe(false);
    expect(shouldReplicate("net:status")).toBe(false);
  });
  it("every classified type has at least one class", () => {
    for (const classes of Object.values(EVENT_CLASSIFICATION)) {
      expect(classes.length).toBeGreaterThan(0);
    }
  });
});
