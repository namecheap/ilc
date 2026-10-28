import { Request, Response } from 'express';

export function ping(req: Request, res: Response) {
    res.send('pong');
}
