import axios from 'axios';
import { Algorithm, ResultLog } from '../models.ts';
import { parseAlgorithmLogs } from './algorithm.tsx';

export function parseAlgorithmFromText(contents: string): Algorithm {
  const resultLog = JSON.parse(contents) as ResultLog;
  return parseAlgorithmLogs(resultLog);
}

export function loadAlgorithmFromFile(file: File): Promise<Algorithm> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', () => {
      try {
        resolve(parseAlgorithmFromText(reader.result as string));
      } catch (err: any) {
        reject(err);
      }
    });

    reader.addEventListener('error', () => {
      reject(new Error('FileReader emitted an error event'));
    });

    reader.readAsText(file);
  });
}

export async function loadAlgorithmFromUrl(logsUrl: string): Promise<Algorithm> {
  const logsResponse = await axios.get<ResultLog>(logsUrl);
  return parseAlgorithmLogs(logsResponse.data);
}

export function getAlgorithmLabelFromUrl(logsUrl: string): string {
  try {
    const parsed = new URL(logsUrl);
    const filename = parsed.pathname.split('/').pop();
    return filename && filename.length > 0 ? filename : parsed.host;
  } catch {
    return logsUrl;
  }
}
