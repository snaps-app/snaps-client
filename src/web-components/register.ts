import r2wc from '@r2wc/react-to-web-component';
import { SupportBoard } from '../components/SupportBoard';
import { RoadmapBoard } from '../components/RoadmapBoard';
import { BugReportForm } from '../components/BugReportForm';
import { FeatureRequestForm } from '../components/FeatureRequestForm';
import { GovernanceDocs } from '../components/GovernanceDocs';
import { CostsBoard } from '../components/CostsBoard';
import { withShadowStyles } from './withShadowStyles';
import { version } from '../version';

function versioned(Component: CustomElementConstructor): CustomElementConstructor {
  return class extends Component {
    connectedCallback() {
      this.setAttribute('data-snaps-version', version);
      (Component.prototype as HTMLElement & { connectedCallback?: () => void }).connectedCallback?.call(this);
    }
  };
}

// Each component is wrapped with withShadowStyles so the compiled Tailwind CSS is
// injected into its Shadow DOM (shadow: 'open' otherwise isolates it unstyled).
const wcSupportBoard = r2wc(withShadowStyles(SupportBoard), {
  shadow: 'open',
  props: {
    projectId: 'string',
    apiKey: 'string',
    apiUrl: 'string',
    defaultTab: 'string',
    sessionUserRef: 'string',
    sessionKey: 'string',
    pageSize: 'number',
    appName: 'string',
  },
});

const wcRoadmapBoard = r2wc(withShadowStyles(RoadmapBoard), {
  shadow: 'open',
  props: {
    projectId: 'string',
    apiKey: 'string',
    apiUrl: 'string',
    showBacklog: 'boolean',
  },
});

const wcBugReportForm = r2wc(withShadowStyles(BugReportForm), {
  shadow: 'open',
  props: {
    projectId: 'string',
    apiKey: 'string',
    apiUrl: 'string',
    appVersion: 'string',
    appName: 'string',
  },
});

const wcFeatureRequestForm = r2wc(withShadowStyles(FeatureRequestForm), {
  shadow: 'open',
  props: {
    projectId: 'string',
    apiKey: 'string',
    apiUrl: 'string',
    appName: 'string',
  },
});

const wcGovernanceDocs = r2wc(withShadowStyles(GovernanceDocs), {
  shadow: 'open',
  props: {
    projectId: 'string',
    apiKey: 'string',
    apiUrl: 'string',
  },
});

const wcCostsBoard = r2wc(withShadowStyles(CostsBoard), { shadow: 'open', props: { projectId: 'string', apiKey: 'string', apiUrl: 'string' } });

export function registerAll() {
  if (typeof window !== 'undefined' && window.customElements) {
    if (!window.customElements.get('snaps-costs-board')) window.customElements.define('snaps-costs-board', versioned(wcCostsBoard));
    if (!window.customElements.get('snaps-support-board')) {
      window.customElements.define('snaps-support-board', versioned(wcSupportBoard));
    }
    if (!window.customElements.get('snaps-roadmap-board')) {
      window.customElements.define('snaps-roadmap-board', versioned(wcRoadmapBoard));
    }
    if (!window.customElements.get('snaps-bug-report-form')) {
      window.customElements.define('snaps-bug-report-form', versioned(wcBugReportForm));
    }
    if (!window.customElements.get('snaps-feature-request-form')) {
      window.customElements.define('snaps-feature-request-form', versioned(wcFeatureRequestForm));
    }
    if (!window.customElements.get('snaps-governance-docs')) {
      window.customElements.define('snaps-governance-docs', versioned(wcGovernanceDocs));
    }
  }
}
