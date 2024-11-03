import { Keypair } from '@solana/web3.js';
import fs from 'fs';

import dayjs, {Dayjs} from "dayjs";
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

export const getNow = () => toUTCDayjs();

export const toUTCDayjs = (param?: string | number) => dayjs.utc(param);

export const truncateToHour = (date: Dayjs): Dayjs => {
    return date.startOf('hour');
};

export const truncateToDay = (date: Dayjs): Dayjs => {
    return date.utcOffset(0).startOf('day');
};

export const loadKeypair = (path: string) => {
    // Expand tilde to home directory if present in path
    if (path.startsWith('~')) {
        const homeDir = process.env.HOME || process.env.USERPROFILE;
        if (homeDir) {
            path = path.replace('~', homeDir);
        } else {
            console.warn('Unable to resolve home directory. Using the path as-is.');
        }
    }
    const keypair = fs.readFileSync(path, "utf-8");
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypair)));
};
