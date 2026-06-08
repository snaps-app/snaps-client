import React, { useState, useEffect } from 'react';
import { SnapsPublicClient } from '../../api/snaps-client';
import { detectEnvironment } from './EnvironmentDetector';
import { FileUploadZone, toast, ToastContainer } from '../shared';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';

export interface BugReportFormProps {
  projectId: string;
  apiKey: string;
  apiUrl?: string;
  appVersion?: string;
  appName?: string;
  onSuccess?: (card: any) => void;
  onCancel?: () => void;
}

export function BugReportForm({
  projectId,
  apiKey,
  apiUrl,
  appVersion,
  appName,
  onSuccess,
  onCancel,
}: BugReportFormProps) {
  // Form State
  const [title, setTitle] = useState('');
  const [application, setApplication] = useState(appName || '');
  const [moduleName, setModuleName] = useState('');
  
  const [actualBehavior, setActualBehavior] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [frequency, setFrequency] = useState('always');
  const [usersAffected, setUsersAffected] = useState('few');
  const [blocksCriticalFlow, setBlocksCriticalFlow] = useState(false);
  const [hasWorkaround, setHasWorkaround] = useState(false);
  const [workaroundDescription, setWorkaroundDescription] = useState('');
  
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTechnicalInfo, setShowTechnicalInfo] = useState(false);
  const [env, setEnv] = useState<any>(null);

  // Validation State
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setEnv(detectEnvironment(appVersion));
  }, [appVersion]);

  const severityToPriority = (sev: string): 'Low' | 'Medium' | 'High' => {
    switch (sev) {
      case 'low': return 'Low';
      case 'medium': return 'Medium';
      case 'high':
      case 'critical':
      default:
        return 'High';
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Título é obrigatório';
    if (title.length > 200) newErrors.title = 'Título deve ter no máximo 200 caracteres';
    if (!actualBehavior.trim()) newErrors.actualBehavior = 'Comportamento atual é obrigatório';
    if (!expectedBehavior.trim()) newErrors.expectedBehavior = 'Comportamento esperado é obrigatório';
    if (hasWorkaround && !workaroundDescription.trim()) {
      newErrors.workaroundDescription = 'Descrição do contorno é obrigatória se houver workaround';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Erro de validação', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    const client = new SnapsPublicClient({ projectId, apiKey, apiUrl });

    try {
      // 1. Upload attachments in parallel
      let uploadResults: Array<{ url: string }> = [];
      if (files.length > 0) {
        uploadResults = await Promise.all(
          files.map(file => client.uploadAttachment(file))
        );
      }

      // 2. Build Markdown attachments
      const attachmentMarkdown = files
        .map((file, i) => {
          const url = uploadResults[i].url;
          return file.type.startsWith('image/')
            ? `![${file.name}](${url})`
            : `[${file.name}](${url})`;
        })
        .join('\n');

      // 3. Build description Markdown
      const description = `## Bug Report: ${title}

**Aplicação:** ${application || 'Não especificada'}
**Módulo:** ${moduleName || 'Não especificado'}
**Severidade:** ${severity} | **Frequência:** ${frequency}
**Usuários afetados:** ${usersAffected} | **Bloqueia fluxo crítico:** ${blocksCriticalFlow ? 'Sim' : 'Não'}

### O que aconteceu
${actualBehavior}

### O que deveria acontecer
${expectedBehavior}

### Passos para reproduzir
${stepsToReproduce || 'Nenhum passo fornecido.'}

### Workaround
${hasWorkaround ? workaroundDescription : 'Nenhum'}

### Anexos
${attachmentMarkdown || 'Nenhum anexo enviado.'}

### Ambiente
- Browser: ${env?.browser || 'Detectando...'}
- OS: ${env?.os || 'Detectando...'}
- Resolução: ${env?.screen_resolution || 'N/A'}
- Versão do App: ${env?.app_version || 'unknown'}`;

      // 4. Create Card
      const payload = {
        title,
        card_type: 'bug',
        priority: severityToPriority(severity),
        description,
        labels: [application, moduleName].filter(Boolean),
        card_metadata: {
          browser: env?.browser,
          os: env?.os,
          screen_resolution: env?.screen_resolution,
          app_version: env?.app_version,
          severity,
          frequency,
          users_affected: usersAffected,
          blocks_critical_flow: blocksCriticalFlow,
          has_workaround: hasWorkaround,
          workaround_description: hasWorkaround ? workaroundDescription : undefined,
          attachment_urls: uploadResults.map(r => r.url),
        },
      };

      const card = await client.createSupportCard(payload);
      toast.success('Bug reportado!', 'O bug foi enviado com sucesso.');
      
      // Reset form
      setTitle('');
      setModuleName('');
      setActualBehavior('');
      setExpectedBehavior('');
      setStepsToReproduce('');
      setSeverity('medium');
      setFrequency('always');
      setUsersAffected('few');
      setBlocksCriticalFlow(false);
      setHasWorkaround(false);
      setWorkaroundDescription('');
      setFiles([]);

      if (onSuccess) {
        onSuccess(card);
      }
    } catch (err: any) {
      toast.error('Erro ao reportar', err.message || 'Houve um problema ao criar o ticket.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 max-w-2xl w-full">
      <ToastContainer />
      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
        Reportar Bug
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seção 1: Identificação */}
        <div className="bg-slate-50 p-4 rounded-lg space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Identificação</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-600">Título do Incidente *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Botão de salvar não responde ao clicar"
                className="w-full px-3 py-2 text-sm border rounded bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              {errors.title && <p className="text-[11px] text-red-500">{errors.title}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Aplicação</label>
              <input
                type="text"
                value={application}
                onChange={e => setApplication(e.target.value)}
                placeholder="Ex: Nubo App"
                disabled={!!appName}
                className="w-full px-3 py-2 text-sm border rounded bg-white focus:outline-none focus:ring-1 focus:ring-red-500 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Módulo / Tela</label>
              <input
                type="text"
                value={moduleName}
                onChange={e => setModuleName(e.target.value)}
                placeholder="Ex: Checkout, Login, Perfil"
                className="w-full px-3 py-2 text-sm border rounded bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>
        </div>

        {/* Seção 2: Descrição Estruturada */}
        <div className="bg-slate-50 p-4 rounded-lg space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Comportamento e Reprodução</h3>
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">O que aconteceu? (Comportamento Atual) *</label>
            <textarea
              value={actualBehavior}
              onChange={e => setActualBehavior(e.target.value)}
              placeholder="Descreva detalhadamente o erro observado..."
              rows={3}
              className="w-full px-3 py-2 text-sm border rounded bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            {errors.actualBehavior && <p className="text-[11px] text-red-500">{errors.actualBehavior}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">O que deveria acontecer? (Comportamento Esperado) *</label>
            <textarea
              value={expectedBehavior}
              onChange={e => setExpectedBehavior(e.target.value)}
              placeholder="Descreva qual era a expectativa para este fluxo..."
              rows={3}
              className="w-full px-3 py-2 text-sm border rounded bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            {errors.expectedBehavior && <p className="text-[11px] text-red-500">{errors.expectedBehavior}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Passos para reproduzir</label>
            <textarea
              value={stepsToReproduce}
              onChange={e => setStepsToReproduce(e.target.value)}
              placeholder={"1. Ir para a tela de configurações\n2. Clicar no botão 'Salvar'\n3. Observar que nada acontece"}
              rows={4}
              className="w-full px-3 py-2 text-sm border rounded bg-white focus:outline-none focus:ring-1 focus:ring-red-500 font-mono text-xs"
            />
          </div>
        </div>

        {/* Seção 3: Classificação */}
        <div className="bg-slate-50 p-4 rounded-lg space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">3. Impacto e Classificação</h3>
          
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 block">Severidade</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(['low', 'medium', 'high', 'critical'] as const).map(sev => {
                const borderMap = {
                  low: 'border-slate-200 checked:border-slate-500',
                  medium: 'border-slate-200 checked:border-yellow-500',
                  high: 'border-slate-200 checked:border-orange-500',
                  critical: 'border-slate-200 checked:border-red-500',
                };
                const bgMap = {
                  low: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
                  medium: 'bg-yellow-50/30 text-yellow-700 border-yellow-200 hover:bg-yellow-50/50',
                  high: 'bg-orange-50/30 text-orange-700 border-orange-200 hover:bg-orange-50/50',
                  critical: 'bg-red-50/30 text-red-700 border-red-200 hover:bg-red-50/50',
                };
                const activeBgMap = {
                  low: 'border-slate-400 bg-slate-100',
                  medium: 'border-yellow-500 bg-yellow-50 text-yellow-800',
                  high: 'border-orange-500 bg-orange-50 text-orange-800',
                  critical: 'border-red-500 bg-red-50 text-red-800',
                };

                const isSelected = severity === sev;

                return (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverity(sev)}
                    className={`p-2.5 rounded-lg border text-center text-xs font-semibold capitalize transition-all ${
                      isSelected ? activeBgMap[sev] : bgMap[sev]
                    }`}
                  >
                    {sev === 'low' && 'Baixa'}
                    {sev === 'medium' && 'Média'}
                    {sev === 'high' && 'Alta'}
                    {sev === 'critical' && 'Crítica'}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Frequência</label>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="always">Sempre acontece</option>
                <option value="sometimes">Às vezes acontece</option>
                <option value="once">Aconteceu uma única vez</option>
                <option value="unknown">Não sei dizer</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Usuários Afetados</label>
              <select
                value={usersAffected}
                onChange={e => setUsersAffected(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="single">Só comigo</option>
                <option value="few">Poucos usuários</option>
                <option value="many">Muitos usuários</option>
                <option value="all">Todos os usuários</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={blocksCriticalFlow}
                onChange={e => setBlocksCriticalFlow(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 border-slate-300 focus:ring-red-500"
              />
              <span className="text-xs font-medium text-slate-700">Bloqueia um fluxo crítico do negócio?</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasWorkaround}
                onChange={e => setHasWorkaround(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 border-slate-300 focus:ring-red-500"
              />
              <span className="text-xs font-medium text-slate-700">Existe um fluxo alternativo (workaround)?</span>
            </label>

            {hasWorkaround && (
              <div className="space-y-1 animate-fadeIn">
                <label className="text-xs font-semibold text-slate-600">Como contornar o problema? *</label>
                <textarea
                  value={workaroundDescription}
                  onChange={e => setWorkaroundDescription(e.target.value)}
                  placeholder="Explique o workaround encontrado..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border rounded bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
                />
                {errors.workaroundDescription && <p className="text-[11px] text-red-500">{errors.workaroundDescription}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Seção 4: Evidências */}
        <div className="bg-slate-50 p-4 rounded-lg space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">4. Evidências</h3>
          <FileUploadZone files={files} onFilesChange={setFiles} />
        </div>

        {/* Seção 5: Informações Técnicas (Collapsible) */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowTechnicalInfo(!showTechnicalInfo)}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">5. Informações Técnicas</span>
            {showTechnicalInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showTechnicalInfo && (
            <div className="p-4 border-t border-slate-200 space-y-2 bg-slate-50/50 font-mono text-[11px] text-slate-600">
              <div><span className="font-semibold text-slate-500">Navegador:</span> {env?.browser}</div>
              <div><span className="font-semibold text-slate-500">Sistema Operacional:</span> {env?.os}</div>
              <div><span className="font-semibold text-slate-500">Resolução de Tela:</span> {env?.screen_resolution}</div>
              <div><span className="font-semibold text-slate-500">Versão da Aplicação:</span> {env?.app_version}</div>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors disabled:opacity-70 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Reportando...
              </>
            ) : (
              'Reportar Bug'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
