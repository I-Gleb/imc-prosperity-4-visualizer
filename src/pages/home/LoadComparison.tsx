import { Button, Code, Group, SegmentedControl, Stack, Text, TextInput } from '@mantine/core';
import { Dropzone, FileRejection } from '@mantine/dropzone';
import { IconUpload } from '@tabler/icons-react';
import { FormEvent, ReactNode, useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ErrorAlert } from '../../components/ErrorAlert.tsx';
import { useAsync } from '../../hooks/use-async.ts';
import { useStore } from '../../store.ts';
import { getAlgorithmLabelFromUrl, loadAlgorithmFromFile, loadAlgorithmFromUrl } from '../../utils/loaders.ts';
import { assertAlgorithmsComparable } from '../visualizer/utils.ts';
import { HomeCard } from './HomeCard.tsx';

type InputMode = 'file' | 'url';
type Side = 'left' | 'right';

function DropzoneContent({ label, fileName }: { label: string; fileName?: string }): ReactNode {
  return (
    <Group justify="center" gap="xl" style={{ minHeight: 80, pointerEvents: 'none' }}>
      <IconUpload size={32}></IconUpload>
      <Stack gap={0}>
        <Text size="lg" inline={true}>
          {label}
        </Text>
        <Text size="sm" c="dimmed">
          {fileName || 'Drag file here or click to select file'}
        </Text>
      </Stack>
    </Group>
  );
}

function getRejectionMessage(rejections: FileRejection[]): Error {
  const messages: string[] = [];

  for (const rejection of rejections) {
    const errorType = {
      'file-invalid-type': 'Invalid type, only log files are supported.',
      'file-too-large': 'File too large.',
      'file-too-small': 'File too small.',
      'too-many-files': 'Too many files.',
    }[rejection.errors[0].code]!;

    messages.push(`Could not load algorithm from ${rejection.file.name}: ${errorType}`);
  }

  return new Error(messages.join('<br/>'));
}

export function LoadComparison(): ReactNode {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const visualizer = useStore(state => state.visualizer);
  const setComparison = useStore(state => state.setComparison);

  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [leftFile, setLeftFile] = useState<File | null>(null);
  const [rightFile, setRightFile] = useState<File | null>(null);
  const [leftUrl, setLeftUrl] = useState('');
  const [rightUrl, setRightUrl] = useState('');
  const [error, setError] = useState<Error>();

  const loadComparisonFiles = useAsync(async (): Promise<void> => {
    if (leftFile === null || rightFile === null) {
      throw new Error('Please select two log files.');
    }

    const [left, right] = await Promise.all([loadAlgorithmFromFile(leftFile), loadAlgorithmFromFile(rightFile)]);
    assertAlgorithmsComparable(left, right);
    setComparison(left, right, { left: leftFile.name, right: rightFile.name });
    navigate('/compare');
  });

  const loadComparisonUrls = useAsync(async (nextLeftUrl: string, nextRightUrl: string): Promise<void> => {
    const [left, right] = await Promise.all([loadAlgorithmFromUrl(nextLeftUrl), loadAlgorithmFromUrl(nextRightUrl)]);
    assertAlgorithmsComparable(left, right);
    setComparison(left, right, {
      left: getAlgorithmLabelFromUrl(nextLeftUrl),
      right: getAlgorithmLabelFromUrl(nextRightUrl),
    });
    navigate(`/compare?open1=${encodeURIComponent(nextLeftUrl)}&open2=${encodeURIComponent(nextRightUrl)}`);
  });

  const onReject = useCallback((rejections: FileRejection[]) => {
    setError(getRejectionMessage(rejections));
  }, []);

  const onDrop = useCallback((side: Side, files: File[]) => {
    setError(undefined);

    if (side === 'left') {
      setLeftFile(files[0]);
      return;
    }

    setRightFile(files[0]);
  }, []);

  const onSubmitUrls = useCallback(
    (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault();

      if (leftUrl.trim().length > 0 && rightUrl.trim().length > 0) {
        loadComparisonUrls.call(leftUrl, rightUrl);
      }
    },
    [leftUrl, rightUrl, loadComparisonUrls],
  );

  useEffect(() => {
    if (visualizer !== null || loadComparisonUrls.loading) {
      return;
    }

    if (!searchParams.has('open1') || !searchParams.has('open2')) {
      return;
    }

    const nextLeftUrl = searchParams.get('open1') || '';
    const nextRightUrl = searchParams.get('open2') || '';

    setInputMode('url');
    setLeftUrl(nextLeftUrl);
    setRightUrl(nextRightUrl);

    if (nextLeftUrl.trim().length > 0 && nextRightUrl.trim().length > 0) {
      loadComparisonUrls.call(nextLeftUrl, nextRightUrl);
    }
  }, []);

  const currentUrl = window.location.origin + window.location.pathname;

  return (
    <HomeCard title="Comparison mode">
      <Text>
        Compare two strategy logs side by side. Comparison mode supports either two file uploads or two URLs that point
        to Prosperity-format log files.
      </Text>
      <Text>
        URL input can also be triggered by browsing to <Code>{currentUrl}?open1=&lt;url1&gt;&open2=&lt;url2&gt;</Code>.
      </Text>

      <SegmentedControl
        fullWidth
        value={inputMode}
        onChange={value => setInputMode(value as InputMode)}
        data={[
          { label: 'Two files', value: 'file' },
          { label: 'Two URLs', value: 'url' },
        ]}
        mb="md"
      />

      {error && <ErrorAlert error={error} mb="sm" />}
      {loadComparisonFiles.error && <ErrorAlert error={loadComparisonFiles.error} mb="sm" />}
      {loadComparisonUrls.error && <ErrorAlert error={loadComparisonUrls.error} mb="sm" />}

      {inputMode === 'file' ? (
        <Stack>
          <Dropzone onDrop={files => onDrop('left', files)} onReject={onReject} multiple={false}>
            <Dropzone.Idle>
              <DropzoneContent label="Strategy A" fileName={leftFile?.name} />
            </Dropzone.Idle>
            <Dropzone.Accept>
              <DropzoneContent label="Strategy A" fileName={leftFile?.name} />
            </Dropzone.Accept>
          </Dropzone>

          <Dropzone onDrop={files => onDrop('right', files)} onReject={onReject} multiple={false}>
            <Dropzone.Idle>
              <DropzoneContent label="Strategy B" fileName={rightFile?.name} />
            </Dropzone.Idle>
            <Dropzone.Accept>
              <DropzoneContent label="Strategy B" fileName={rightFile?.name} />
            </Dropzone.Accept>
          </Dropzone>

          <Button fullWidth onClick={loadComparisonFiles.call} loading={loadComparisonFiles.loading}>
            Load comparison
          </Button>
        </Stack>
      ) : (
        <form onSubmit={onSubmitUrls}>
          <TextInput
            label="Strategy A URL"
            placeholder="URL"
            value={leftUrl}
            onInput={e => setLeftUrl((e.target as HTMLInputElement).value)}
          />

          <TextInput
            label="Strategy B URL"
            placeholder="URL"
            value={rightUrl}
            onInput={e => setRightUrl((e.target as HTMLInputElement).value)}
            mt="sm"
          />

          <Button fullWidth type="submit" loading={loadComparisonUrls.loading} mt="sm">
            Load comparison
          </Button>
        </form>
      )}
    </HomeCard>
  );
}
