// src/server/restart.ts
var restartSoon = () => {
	setTimeout(() => process.exit(0), 400);
};
export { restartSoon as t };
