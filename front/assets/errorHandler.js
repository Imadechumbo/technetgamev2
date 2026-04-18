export function errorHandler(err, req, res, next) {
    const origin = req.headers.origin;

    const allowedOrigins = [
        "https://technetgame.com.br",
        "https://www.technetgame.com.br",
        "https://technetgame-site.pages.dev"
    ];

    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
    }

    res.status(err.status || 500).json({
        ok: false,
        error: err.message || "Internal Server Error"
    });
}