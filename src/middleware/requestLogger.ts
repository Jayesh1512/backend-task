import { Request, Response, NextFunction } from "express";
/**
**************************
@params req: Request, res: Response, next: NextFunction
@return void

[FUNCTION] : Log request method, url, params, query, body and headers (with Authorization masked); on response finish log status and duration.

**************************
*/
export default function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const start = Date.now();
  const { method, url } = req as Request & { ip?: string };
  const timestamp = new Date().toISOString();
  const headers = { ...(req.headers as Record<string, any>) };
  if (headers.authorization) headers.authorization = "***REDACTED***";

  console.log(
    `${timestamp} → ${method} ${url} from ${
      req.ip || (req.socket && req.socket.remoteAddress)
    }`
  );
  console.log("");

  if (req.params && Object.keys(req.params).length)
    console.log("    params:", JSON.stringify(req.params));
  console.log("");

  if (req.query && Object.keys(req.query).length)
    console.log("    query:", JSON.stringify(req.query));
  console.log("");

  if (req.body && typeof req.body === "object" && Object.keys(req.body).length)
    console.log("    body:", JSON.stringify(req.body));
  console.log("");

  console.log("    headers:", JSON.stringify(headers));
  console.log("");
  console.log("");

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `${new Date().toISOString()} ← ${method} ${url} ${
        res.statusCode
      } ${duration}ms`
    );
    console.log("");
  });

  next();
}
