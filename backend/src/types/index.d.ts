export { };

declare global {
    namespace Express {
        interface Request {
            user?: any; // or the specific type of your user
        }
    }
}
