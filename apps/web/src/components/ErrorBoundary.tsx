import { Component, type ReactNode } from 'react';
import {
  makeStyles,
  Card,
  CardHeader,
  Text,
  Title3,
  Button,
  MessageBar,
  MessageBarBody,
  tokens,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  container: { padding: tokens.spacingVerticalXXL, maxWidth: '600px', margin: '0 auto' },
  card: { marginTop: tokens.spacingVerticalL },
  actions: { marginTop: tokens.spacingVerticalM },
});

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const styles = useStyles();
  return (
    <div className={styles.container}>
      <Title3>Something went wrong</Title3>
      <Card className={styles.card}>
        <CardHeader header={<Text weight="semibold">Application Error</Text>} />
        <MessageBar intent="error">
          <MessageBarBody>
            {error?.message ?? 'An unexpected error occurred.'}
          </MessageBarBody>
        </MessageBar>
        <div className={styles.actions}>
          <Button appearance="primary" onClick={onReset}>
            Try Again
          </Button>
        </div>
      </Card>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}
