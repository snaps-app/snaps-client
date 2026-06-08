import React, { useState } from 'react';
import { SnapsPublicClient } from '../../api/snaps-client';
import { FileUploadZone, toast, ToastContainer } from '../shared';
import { Loader2 } from 'lucide-react';

export interface FeatureRequestFormProps {
  projectId: string;
  apiKey: string;
  apiUrl?: string;
  appName?: string;
  onSuccess?: (card: any) => void;
  onCancel?: () => void;
}

export function FeatureRequestForm({
  projectId,
  apiKey,
  apiUrl,
  appName,
  onSuccess,
  onCancel,
}: FeatureRequestFormProps) {
  // Form State
  const [title, setTitle] = useState('');
  const [application, setApplication] = useState(appName || '');
  const [moduleName, setModuleName] = useState('');

  const [problemOrOpportunity, setProblemOrOpportunity] = useState('');
  const [proposedSolution, setProposedSolution] = useState('');
  const [expectedImpact, setExpectedImpact] = useState('');
  const [priorityJustification, setPriorityJustification] = useState('');

  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation State
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Título é obrigatório';
    if (title.length > 200) newErrors.title = 'Título deve ter no máximo 200 caracteres';
    if (!problemOrOpportunity.trim()) newErrors.problemOrOpportunity = 'Este campo é obrigatório';
    if (!proposedSolution.trim()) newErrors.proposedSolution = 'Este campo é obrigatório';
    if (!expectedImpact.trim()) newErrors.expectedImpact = 'Este campo é obrigatório';
    if (!priorityJustification.trim()) newErrors.priorityJustification = 'Este campo é obrigatório';
    
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
      const description = `## Feature Request: ${title}

**Aplicação:** ${application || 'Não especificada'}
**Módulo:** ${moduleName || 'Não especificado'}

### Dor / Oportunidade
${problemOrOpportunity}

### Solução Proposta
${proposedSolution}

### Impacto Esperado
${expectedImpact}

### Justificativa de Prioridade
${priorityJustification}

### Anexos
${attachmentMarkdown || 'Nenhum anexo enviado.'}`;

      // 4. Create Card
      const payload = {
        title,
        card_type: 'feature',
        priority: 'Medium', // default to Medium
        description,
        labels: [application, moduleName].filter(Boolean),
        card_metadata: {
          problem_or_opportunity: problemOrOpportunity,
          proposed_solution: proposedSolution,
          expected_impact: expectedImpact,
          priority_justification: priorityJustification,
          attachment_urls: uploadResults.map(r => r.url),
        },
      };

      const card = await client.createSupportCard(payload);
      toast.success('Sugestão enviada!', 'Sua sugestão de melhoria foi enviada com sucesso.');
      
      // Reset form
      setTitle('');
      setModuleName('');
      setProblemOrOpportunity('');
      setProposedSolution('');
      setExpectedImpact('');
      setPriorityJustification('');
      setFiles([]);

      if (onSuccess) {
        onSuccess(card);
      }
    } catch (err: any) {
      toast.error('Erro ao enviar', err.message || 'Houve um problema ao criar o ticket.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 max-w-2xl w-full">
      <ToastContainer />
      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
        Sugerir Melhoria
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seção 1: Identificação */}
        <div className="bg-slate-50 p-4 rounded-lg space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Identificação</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-600">Título da Melhoria *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Filtro avançado por período na listagem"
                className="w-full px-3 py-2 text-sm border rounded bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
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
                className="w-full px-3 py-2 text-sm border rounded bg-white focus:outline-none focus:ring-1 focus:ring-green-500 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Módulo / Tela</label>
              <input
                type="text"
                value={moduleName}
                onChange={e => setModuleName(e.target.value)}
                placeholder="Ex: Relatórios, Dashboard"
                className="w-full px-3 py-2 text-sm border rounded bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Seção 2: Detalhamento */}
        <div className="bg-slate-50 p-4 rounded-lg space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Detalhamento da Sugestão</h3>
          
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <label className="text-xs font-semibold text-slate-600">Qual dor ou oportunidade você identificou? *</label>
              <span className="text-[10px] text-slate-400">{problemOrOpportunity.length} caracteres</span>
            </div>
            <textarea
              value={problemOrOpportunity}
              onChange={e => setProblemOrOpportunity(e.target.value)}
              placeholder="Descreva o problema do usuário ou a oportunidade de melhoria..."
              rows={3}
              className="w-full px-3 py-2 text-sm border rounded bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            {errors.problemOrOpportunity && <p className="text-[11px] text-red-500">{errors.problemOrOpportunity}</p>}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <label className="text-xs font-semibold text-slate-600">Como você imagina a solução? *</label>
              <span className="text-[10px] text-slate-400">{proposedSolution.length} caracteres</span>
            </div>
            <textarea
              value={proposedSolution}
              onChange={e => setProposedSolution(e.target.value)}
              placeholder="Descreva como você imagina que o recurso deveria funcionar..."
              rows={3}
              className="w-full px-3 py-2 text-sm border rounded bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            {errors.proposedSolution && <p className="text-[11px] text-red-500">{errors.proposedSolution}</p>}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <label className="text-xs font-semibold text-slate-600">Que benefício isso traria? (Impacto esperado) *</label>
              <span className="text-[10px] text-slate-400">{expectedImpact.length} caracteres</span>
            </div>
            <textarea
              value={expectedImpact}
              onChange={e => setExpectedImpact(e.target.value)}
              placeholder="Métricas de sucesso, economia de tempo, satisfação do usuário..."
              rows={2}
              className="w-full px-3 py-2 text-sm border rounded bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            {errors.expectedImpact && <p className="text-[11px] text-red-500">{errors.expectedImpact}</p>}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <label className="text-xs font-semibold text-slate-600">Por que isso é importante agora? (Justificativa) *</label>
              <span className="text-[10px] text-slate-400">{priorityJustification.length} caracteres</span>
            </div>
            <textarea
              value={priorityJustification}
              onChange={e => setPriorityJustification(e.target.value)}
              placeholder="Qual o valor estratégico imediato de fazer isso agora..."
              rows={2}
              className="w-full px-3 py-2 text-sm border rounded bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            {errors.priorityJustification && <p className="text-[11px] text-red-500">{errors.priorityJustification}</p>}
          </div>
        </div>

        {/* Seção 3: Anexos */}
        <div className="bg-slate-50 p-4 rounded-lg space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">3. Anexos / Referências</h3>
          <FileUploadZone files={files} onFilesChange={setFiles} />
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
            className="px-5 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors disabled:opacity-70 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar Sugestão'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
