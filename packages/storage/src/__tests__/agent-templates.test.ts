import { describe, it, expect } from 'vitest';
import {
  generateRootReadme,
  generateAgentReadme,
  generateSchemaDoc,
  generateEditingDoc,
  generateValidationDoc,
  generateDataSummary,
  generateStaticAgentDocs,
} from '../agent-templates.js';
import type { DataSummaryInput } from '../agent-templates.js';

describe('Agent Template Generation', () => {
  describe('generateRootReadme', () => {
    it('produces a root README with app and schema version', () => {
      const readme = generateRootReadme();
      expect(readme).toContain('FinPlanner');
      expect(readme).toContain('.agent/README.md');
      expect(readme).toContain('Schema Version: 3.0.0');
    });
  });

  describe('generateAgentReadme', () => {
    it('produces agent README with all documentation pointers', () => {
      const readme = generateAgentReadme();
      expect(readme).toContain('SCHEMA.md');
      expect(readme).toContain('EDITING.md');
      expect(readme).toContain('VALIDATION.md');
      expect(readme).toContain('DATA_SUMMARY.md');
      expect(readme).toContain('schemas/');
      expect(readme).toContain('Schema Version: 3.0.0');
    });

    it('includes folder structure diagram', () => {
      const readme = generateAgentReadme();
      expect(readme).toContain('shared/');
      expect(readme).toContain('corpus.ndjson');
      expect(readme).toContain('tax/');
      expect(readme).toContain('retirement/');
    });
  });

  describe('generateSchemaDoc', () => {
    it('documents all record types', () => {
      const schema = generateSchemaDoc();
      const types = ['header', 'household', 'account', 'incomeStream', 'adjustment',
        'appConfig', 'taxYear', 'taxDocument', 'checklistItem', 'anomaly',
        'retirementPlan', 'simulationResult'];
      for (const type of types) {
        expect(schema).toContain(type);
      }
    });

    it('documents all filing status values', () => {
      const schema = generateSchemaDoc();
      expect(schema).toContain('single');
      expect(schema).toContain('mfj');
      expect(schema).toContain('survivor');
    });

    it('documents account types', () => {
      const schema = generateSchemaDoc();
      expect(schema).toContain('taxable');
      expect(schema).toContain('taxDeferred');
      expect(schema).toContain('deferredComp');
      expect(schema).toContain('roth');
    });

    it('includes shared corpus decomposition', () => {
      const schema = generateSchemaDoc();
      expect(schema).toContain('PlanInput');
      expect(schema).toContain('corpus.ndjson');
    });
  });

  describe('generateEditingDoc', () => {
    it('includes shared corpus edit checklist', () => {
      const editing = generateEditingDoc();
      expect(editing).toContain('Shared Corpus Edit Checklist');
      expect(editing).toContain('savedAt');
      expect(editing).toContain('draft');
      expect(editing).toContain('filed');
    });

    it('documents computed fields warning', () => {
      const editing = generateEditingDoc();
      expect(editing).toContain('computedFederalTax');
      expect(editing).toContain('DO NOT EDIT');
    });

    it('includes staleness warnings', () => {
      const editing = generateEditingDoc();
      expect(editing).toContain('DATA_SUMMARY.md');
      expect(editing).toContain('stale');
    });

    it('documents tax year status rules', () => {
      const editing = generateEditingDoc();
      expect(editing).toContain('draft');
      expect(editing).toContain('ready');
      expect(editing).toContain('filed');
      expect(editing).toContain('amended');
      expect(editing).toContain('frozen snapshot');
    });
  });

  describe('generateValidationDoc', () => {
    it('includes all 12 validation steps', () => {
      const validation = generateValidationDoc();
      expect(validation).toContain('### 1.');
      expect(validation).toContain('### 2.');
      expect(validation).toContain('### 3.');
      expect(validation).toContain('### 4.');
      expect(validation).toContain('### 5.');
      expect(validation).toContain('### 6.');
      expect(validation).toContain('### 7.');
      expect(validation).toContain('### 8.');
      expect(validation).toContain('### 9.');
      expect(validation).toContain('### 10.');
      expect(validation).toContain('### 11.');
      expect(validation).toContain('### 12.');
    });

    it('covers JSON validity', () => {
      const validation = generateValidationDoc();
      expect(validation).toContain('JSON Validity');
    });

    it('covers referential integrity', () => {
      const validation = generateValidationDoc();
      expect(validation).toContain('Referential Integrity');
      expect(validation).toContain('taxDocument.taxYear');
    });

    it('covers enum validity', () => {
      const validation = generateValidationDoc();
      expect(validation).toContain('Enum Validity');
      expect(validation).toContain('filingStatus');
    });
  });

  describe('generateDataSummary', () => {
    it('generates summary with tax years and accounts', () => {
      const input: DataSummaryInput = {
        taxYears: [
          { year: 2024, status: 'filed' },
          { year: 2025, status: 'draft' },
        ],
        accounts: [
          { name: 'Fidelity Brokerage', type: 'taxable' },
          { name: 'Vanguard 401k', type: 'taxDeferred' },
        ],
        incomeStreams: [{ name: 'Corporate Pension' }],
        scenarioCount: 2,
        documentsByYear: { 2024: ['w2-employer.pdf', '1099-div-broker.pdf'] },
      };

      const summary = generateDataSummary(input);
      expect(summary).toContain('Tax Years: 2');
      expect(summary).toContain('Accounts: 2');
      expect(summary).toContain('Income Streams: 1');
      expect(summary).toContain('Scenarios: 2');
      expect(summary).toContain('2024');
      expect(summary).toContain('filed');
      expect(summary).toContain('2025');
      expect(summary).toContain('draft');
      expect(summary).toContain('Fidelity Brokerage');
      expect(summary).toContain('Corporate Pension');
      expect(summary).toContain('w2-employer.pdf');
    });

    it('handles empty data', () => {
      const input: DataSummaryInput = {
        taxYears: [],
        accounts: [],
        incomeStreams: [],
        scenarioCount: 0,
        documentsByYear: {},
      };

      const summary = generateDataSummary(input);
      expect(summary).toContain('Tax Years: 0');
      expect(summary).toContain('(none)');
    });

    it('does not include dollar amounts', () => {
      const input: DataSummaryInput = {
        taxYears: [{ year: 2024, status: 'filed' }],
        accounts: [{ name: 'Acct', type: 'taxable' }],
        incomeStreams: [],
        scenarioCount: 0,
        documentsByYear: {},
      };

      const summary = generateDataSummary(input);
      expect(summary).not.toMatch(/\$\d/);
    });

    it('includes generation timestamp', () => {
      const summary = generateDataSummary({
        taxYears: [], accounts: [], incomeStreams: [],
        scenarioCount: 0, documentsByYear: {},
      });
      expect(summary).toContain('Generated:');
      expect(summary).toMatch(/\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('generateStaticAgentDocs', () => {
    it('returns all 5 static files', () => {
      const docs = generateStaticAgentDocs();
      expect(Object.keys(docs)).toHaveLength(5);
      expect(docs).toHaveProperty('README.md');
      expect(docs).toHaveProperty('.agent/README.md');
      expect(docs).toHaveProperty('.agent/SCHEMA.md');
      expect(docs).toHaveProperty('.agent/EDITING.md');
      expect(docs).toHaveProperty('.agent/VALIDATION.md');
    });

    it('all files are non-empty strings', () => {
      const docs = generateStaticAgentDocs();
      for (const [path, content] of Object.entries(docs)) {
        expect(typeof content).toBe('string');
        expect(content.length).toBeGreaterThan(100);
      }
    });
  });
});
