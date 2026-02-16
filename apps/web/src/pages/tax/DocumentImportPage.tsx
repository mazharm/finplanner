import {
  makeStyles,
  tokens,
  Card,
  CardHeader,
  Text,
  Title3,
  Button,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { DocumentRegular, ArrowImportRegular, CheckmarkRegular } from '@fluentui/react-icons';
import { useRef, useCallback, useState } from 'react';
import { useTaxStore } from '../../stores/tax-store.js';
import type { TaxDocument, TaxFormType } from '@finplanner/domain';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  dropZone: {
    border: `2px dashed ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingVerticalXXL,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalM,
    cursor: 'pointer',
  },
  dropZoneActive: {
    borderColor: tokens.colorBrandStroke1,
    backgroundColor: tokens.colorBrandBackground2,
  },
});

function confidenceColor(conf: number): 'success' | 'warning' | 'danger' {
  if (conf >= 0.8) return 'success';
  if (conf >= 0.5) return 'warning';
  return 'danger';
}

function generateId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function DocumentImportPage() {
  const styles = useStyles();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const { documents, addDocument, updateDocument } = useTaxStore();
  const [importMessage, setImportMessage] = useState('');

  const handlePdfImport = useCallback(
    async (files: FileList) => {
      for (const file of Array.from(files)) {
        if (!file.name.toLowerCase().endsWith('.pdf')) {
          setImportMessage(`Skipped ${file.name}: not a PDF file.`);
          continue;
        }

        // In production, this would use pdf.js to extract text and then identify the form.
        // For now, create a placeholder document entry.
        const doc: TaxDocument = {
          id: generateId(),
          taxYear: new Date().getFullYear(),
          formType: 'other' as TaxFormType,
          issuerName: file.name.replace('.pdf', ''),
          sourceFileName: file.name,
          extractedFields: {},
          fieldConfidence: {},
          extractionConfidence: 0,
          lowConfidenceFields: [],
          confirmedByUser: false,
          importedAt: new Date().toISOString(),
        };

        addDocument(doc);
        setImportMessage(`Imported ${file.name}. Review extracted data and confirm.`);
      }
    },
    [addDocument],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files.length > 0) {
        handlePdfImport(e.dataTransfer.files);
      }
    },
    [handlePdfImport],
  );

  return (
    <div className={styles.root}>
      <Title3>
        <DocumentRegular /> Tax Document Import
      </Title3>
      {importMessage && (
        <MessageBar intent="info">
          <MessageBarBody>{importMessage}</MessageBarBody>
        </MessageBar>
      )}
      <Card>
        <CardHeader
          header={<Text weight="semibold">Import Tax Documents (PDF)</Text>}
          description="Upload W-2s, 1099s, and other tax forms. Data is extracted client-side using pdf.js."
        />
        <div
          className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <ArrowImportRegular fontSize={48} />
          <Text>{dragActive ? 'Drop PDF files here...' : 'Drag and drop PDF tax documents here, or click to browse.'}</Text>
          <Text size={200}>Supported: W-2, 1099-INT, 1099-DIV, 1099-B, 1099-R, 1098</Text>
          <Button appearance="primary" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
            Browse PDFs
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files) handlePdfImport(e.target.files); }}
          />
        </div>
      </Card>
      <Card>
        <CardHeader header={<Text weight="semibold">Imported Documents ({documents.length})</Text>} />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Form Type</TableHeaderCell>
              <TableHeaderCell>Issuer</TableHeaderCell>
              <TableHeaderCell>Tax Year</TableHeaderCell>
              <TableHeaderCell>Confidence</TableHeaderCell>
              <TableHeaderCell>Confirmed</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Text italic>No documents imported yet.</Text>
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell><Badge appearance="outline">{doc.formType}</Badge></TableCell>
                  <TableCell>{doc.issuerName}</TableCell>
                  <TableCell>{doc.taxYear}</TableCell>
                  <TableCell>
                    <Badge appearance="filled" color={confidenceColor(doc.extractionConfidence)}>
                      {(doc.extractionConfidence * 100).toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {doc.confirmedByUser ? (
                      <Badge appearance="filled" color="success">Confirmed</Badge>
                    ) : (
                      <Badge appearance="outline" color="warning">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!doc.confirmedByUser && (
                      <Button
                        appearance="subtle"
                        icon={<CheckmarkRegular />}
                        size="small"
                        onClick={() => updateDocument(doc.id, { confirmedByUser: true })}
                      >
                        Confirm
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
