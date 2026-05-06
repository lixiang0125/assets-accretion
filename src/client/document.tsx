import { renderToStaticMarkup } from "react-dom/server";

const assetVersion = "20260506-ui-architecture";

function Document() {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>资产增值统计</title>
        <link rel="stylesheet" href={`/assets/styles.css?v=${assetVersion}`} />
      </head>
      <body>
        <div id="root" />
        <script type="module" src={`/assets/app.js?v=${assetVersion}`} />
      </body>
    </html>
  );
}

export function renderDocument() {
  return `<!doctype html>${renderToStaticMarkup(<Document />)}`;
}
