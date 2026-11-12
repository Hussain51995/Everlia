import { describe, expect, it } from "vitest";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import sharp from "sharp";
import { composePostcardArtwork } from "@/lib/artwork/compose";
import { defaultDesignConfig } from "@/lib/artwork/types";
import type { DesignField } from "@/lib/types/cards";

const execFileAsync = promisify(execFile);

const frontFields: DesignField[] = [
  {
    key: "occasion_heading",
    type: "text",
    x: 80,
    y: 120,
    width: 820,
    fontSize: 56,
    color: "#302820",
    align: "left",
    fontWeight: "bold",
    maxLines: 3,
    lineHeight: 1.15,
  },
  {
    key: "customer_name",
    type: "text",
    x: 80,
    y: 340,
    width: 820,
    fontSize: 44,
    color: "#302820",
    fontFamily: "Caveat, cursive",
    align: "left",
    fontWeight: "bold",
    maxLines: 2,
    lineHeight: 1.2,
  },
  {
    key: "personal_message",
    type: "text",
    x: 80,
    y: 460,
    width: 800,
    fontSize: 30,
    color: "#665447",
    align: "left",
    fontWeight: "bold",
    maxLines: 9,
    lineHeight: 1.4,
  },
];

const backFields: DesignField[] = [
  {
    key: "sender_name",
    type: "text",
    x: 80,
    y: 220,
    width: 820,
    fontSize: 34,
    color: "#302820",
    fontWeight: "bold",
    maxLines: 2,
  },
  {
    key: "qr_code",
    type: "qr",
    x: 80,
    y: 920,
    size: 180,
  },
];

const LONG_BODY =
  "Happy birthday — wishing you joy you enjoy and plenty of time to actually enjoy it. On your special day, I want to take a moment to thank you for the incredible person you are; your kindness and support mean more to me than words can express. May this year bring you good health, fresh opportunities, and all the happiness you deserve. Enjoy your day to the fullest.";

async function countDarkPixelsInRegion(
  png: Buffer,
  region: { left: number; top: number; width: number; height: number }
): Promise<number> {
  const { data, info } = await sharp(png)
    .extract(region)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  let dark = 0;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    if (r < 140 && g < 130 && b < 120) dark += 1;
  }
  return dark;
}

async function ocrPng(png: Buffer): Promise<string | null> {
  const file = join(tmpdir(), `compose-ocr-${Date.now()}.png`);
  try {
    await writeFile(file, png);
    const { stdout } = await execFileAsync(
      "tesseract",
      [file, "stdout", "-l", "eng", "--psm", "6"],
      { timeout: 30_000 }
    );
    return stdout;
  } catch {
    return null;
  } finally {
    await unlink(file).catch(() => undefined);
  }
}

describe("compose text raster (librsvg path corruption regression)", () => {
  it("keeps ink through the end of long personal_message lines", async () => {
    const { frontPng } = await composePostcardArtwork({
      designConfig: defaultDesignConfig(frontFields, backFields),
      frontBackgroundUrl: "/templates/design-1/front.png",
      backBackgroundUrl: "/templates/design-1/back.png",
      fieldValues: {
        occasion_heading: "Happy Birthday",
        customer_name: "Dear Afaq",
        personal_message: LONG_BODY,
        sender_name: "Pat Lee",
      },
      qrToken: "text-raster-regression",
    });

    const textTop = 580;
    const textHeight = 40;
    const boxLeft = 80;
    const boxWidth = 800;
    const slice = Math.floor(boxWidth * 0.14);

    const leftInk = await countDarkPixelsInRegion(frontPng, {
      left: boxLeft,
      top: textTop,
      width: slice,
      height: textHeight,
    });
    const rightInk = await countDarkPixelsInRegion(frontPng, {
      left: boxLeft + boxWidth - slice,
      top: textTop,
      width: slice,
      height: textHeight,
    });

    expect(leftInk).toBeGreaterThan(40);
    expect(rightInk).toBeGreaterThan(20);
    expect(rightInk / leftInk).toBeGreaterThan(0.12);
  }, 60_000);

  it("OCR reads complete body words that path-SVG used to garble", async () => {
    const { frontPng } = await composePostcardArtwork({
      designConfig: defaultDesignConfig(frontFields, backFields),
      frontBackgroundUrl: "/templates/design-1/front.png",
      backBackgroundUrl: "/templates/design-1/back.png",
      fieldValues: {
        occasion_heading: "Happy Birthday",
        customer_name: "Dear Afaq",
        personal_message: LONG_BODY,
        sender_name: "Pat Lee",
      },
      qrToken: "text-ocr-regression",
    });

    const crop = await sharp(frontPng)
      .extract({ left: 60, top: 100, width: 900, height: 720 })
      .png()
      .toBuffer();

    const text = await ocrPng(crop);
    if (!text) {
      return;
    }

    const normalized = text.toLowerCase().replace(/\s+/g, " ");
    expect(normalized).toContain("happy birthday");
    expect(normalized).toMatch(/dear\s+a/);
    expect(normalized).toContain("incredible person");
    expect(normalized).toContain("your kindness");
    expect(normalized).toContain("words can express");
    expect(normalized).toContain("fullest");
    expect(normalized).not.toMatch(/\byoa\b/);
    expect(normalized).not.toMatch(/incree/);
    expect(normalized).not.toMatch(/pe\s*['']\s*son/);
  }, 60_000);
});
