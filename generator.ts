import { createRequire } from "https://deno.land/std@0.161.0/node/module.ts";
const require = createRequire(import.meta.url);

const { PDFDocument, grayscale, rgb } = require(
  "pdf-lib",
);
const fontKit = require("@pdf-lib/fontkit");

let highResTemplate: Uint8Array;
let lowResTemplate: Uint8Array;

const BASE_URL =
  `https://raw.githubusercontent.com/aricart/services_demo/main/assets`;

async function load(url: string): Promise<Uint8Array> {
  const r = await fetch(url);
  if (!r.ok) {
    return Promise.reject(new Error(`error loading resource ${url}`));
  }
  const v = new Uint8Array(await r.arrayBuffer());
  console.log(`loaded ${url}`);
  return v;
}

async function getTemplate(highRes: boolean): Promise<Uint8Array> {
  if (highRes) {
    if (!highResTemplate) {
      highResTemplate = await load(
        `${BASE_URL}/badge.pdf`,
      );
    }
    return highResTemplate;
  }
  if (!lowResTemplate) {
    lowResTemplate = await load(
      `${BASE_URL}/badge.png`,
    );
  }
  return lowResTemplate;
}

const fontBytes = await load(`${BASE_URL}/Inter-Bold.ttf`);

type Size = {
  width: number;
  height: number;
};

type Rectangle = {
  x: number;
  y: number;
} & Size;

type TextInfo = {
  text: string;
  fontSize: number;
  fontHeight: number;
  hasDescender: boolean;
  descenderHeight: number;
  size: Size;
};

// the location of the labels printable area
const LabelRectangle: Rectangle = { x: 30, y: 25, width: 540, height: 184 };
const PADDING = 40;

/**
 * Calculate an approximate bounds of all the lines
 * @param lines
 */
function union(...lines: TextInfo[]): Rectangle {
  const R = Object.assign({ x: 0, y: 0, width: 0, height: 0 });
  for (let i = lines.length - 1; i > -1; i--) {
    if (R.height > 0) {
      R.height += lines[i].descenderHeight * .75;
    }
    R.width = Math.max(R.width, lines[i].size.width);
    R.height += lines[i].size.height;
  }
  return R;
}

/**
 * Fit a line of text on the label
 * @param font
 * @param text
 * @param maxFontSize
 */
//@ts-ignore: object
function fitLine(font: PDFFont, text: string, maxFontSize = 80): TextInfo {
  // text box lineBounds is 30,25,540,184
  const maxWidth = LabelRectangle.width - PADDING;
  const maxHeight = (LabelRectangle.height - PADDING) * .80;
  for (let fontSize = maxFontSize; fontSize > 0; fontSize--) {
    const w = font.widthOfTextAtSize(text, fontSize);
    const hasDescender = text.includes("q") || text.includes("y") ||
      text.includes("p") || text.includes("f") || text.includes("g") ||
      text.includes("j");
    const fontHeight = font.sizeAtHeight(fontSize);
    const h = fontHeight;
    if (h > maxHeight) {
      continue;
    }
    const descenderHeight = font.heightAtSize(fontSize, { descender: true }) -
      font.heightAtSize(fontSize, { descender: false });
    if (maxWidth >= w) {
      return {
        text,
        fontHeight,
        fontSize,
        hasDescender,
        descenderHeight,
        size: { width: w, height: h },
      };
    }
  }
  return {
    text,
    fontHeight: 1,
    fontSize: 1,
    size: { width: 1, height: 1 },
    descenderHeight: 0,
    hasDescender: false,
  };
}

function debugRectangle(
  // @ts-ignore: page is a real object
  page: PDFPage,
  r: Rectangle,
  // @ts-ignore: page is a real object
  color: RGB = rgb(1, 1, 1),
) {
  const o = Object.assign(
    { borderColor: color, borderWidth: 1, opacity: 0 },
    r,
  );
  page.drawRectangle(o);
}

export async function generateBadge(
  args: { name: string; company?: string },
  highres = false,
): Promise<Uint8Array> {
  const template = await getTemplate(highres);
  let doc;
  let page;
  if (highres) {
    doc = await PDFDocument.load(template);
    page = doc.getPage(0);
  } else {
    doc = await PDFDocument.create();
    const png = await doc.embedPng(template);
    page = doc.addPage([png.width, png.height]);
    page.drawImage(png, { x: 0, y: 0, width: png.width, height: png.height });
  }
  doc.registerFontkit(fontKit);
  const font = await doc.embedFont(fontBytes);
  page.setFontColor(grayscale(1.0));
  page.setFont(font);

  // compute lineBounds for each of the lines
  const name = fitLine(font, args.name);
  const lines = [name];
  // make the company name smaller
  const maxFontSize = name.fontSize > 75
    ? name.fontSize / 2
    : name.fontSize - 10;
  if (args.company?.length) {
    const company = fitLine(font, args.company!, maxFontSize);
    lines.push(company);
  }

  const pageWidth = page.getWidth();
  const r = union(...lines);

  // center the rectangle on the target area
  r.x = Math.floor((pageWidth - r.width) / 2);
  r.y = ((LabelRectangle.height - r.height) / 2) + LabelRectangle.y;
  // add some visual padding if we have a company line
  if (lines.length === 2) {
    r.y += lines[1].descenderHeight / 3;
  }

  // debugRectangle(page, r);

  let y = r.y;
  let x: number;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    x = Math.floor((pageWidth - line.size.width) / 2);
    page.setFontSize(line.fontSize);
    page.moveTo(x, y);
    page.drawText(line.text);
    y += line.descenderHeight + line.size.height;
  }

  // rescale the document so it prints smaller
  page.scale(0.5, 0.5);
  page.setSize(300, 400);
  return doc.save();
}
