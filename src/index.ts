import { registerAll } from './web-components/register';

// Auto-register when loaded in browser (e.g. UMD CDN script tag)
if (typeof window !== 'undefined') {
  registerAll();
}

export { registerAll };
export * from './api/snaps-client';
export * from './components/SupportBoard';
export * from './components/RoadmapBoard';
export * from './components/BugReportForm';
export * from './components/FeatureRequestForm';
export * from './components/GovernanceDocs';
export * from './components/shared';
