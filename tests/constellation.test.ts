import { describe, expect, it } from "vitest";
import { computeMagneticOffset } from "../src/lib/constellation";

describe("별자리 노드 마그네틱 호버 오프셋", () => {
  it("커서가 중심과 정확히 겹치면 오프셋이 없다", () => {
    expect(
      computeMagneticOffset({ x: 100, y: 100 }, { x: 100, y: 100 }, 4),
    ).toEqual({ x: 0, y: 0 });
  });

  it("커서가 멀리 있어도 오프셋 크기는 maxOffset을 넘지 않는다", () => {
    const offset = computeMagneticOffset(
      { x: 1000, y: 100 },
      { x: 0, y: 100 },
      4,
    );
    expect(Math.hypot(offset.x, offset.y)).toBeCloseTo(4, 5);
    expect(offset.x).toBeGreaterThan(0);
    expect(offset.y).toBeCloseTo(0, 5);
  });

  it("커서가 가까이 있으면 거리에 비례해 작은 오프셋을 돌려준다", () => {
    const offset = computeMagneticOffset(
      { x: 10, y: 0 },
      { x: 0, y: 0 },
      4,
    );
    // distance(10) < maxOffset / strength(4 / 0.35 ≈ 11.43) 이므로 비례 구간
    expect(offset.x).toBeCloseTo(3.5, 5);
    expect(offset.y).toBe(0);
  });
});
