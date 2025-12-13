import React from 'react';
import { FileQuestion, Users, Calendar, Trophy, Banknote, Plus } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  type?: 'default' | 'players' | 'rounds' | 'scores' | 'fines';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  type = 'default'
}) => {
  const getDefaultIcon = () => {
    switch (type) {
      case 'players':
        return <Users size={64} className="text-slate-300" />;
      case 'rounds':
        return <Calendar size={64} className="text-slate-300" />;
      case 'scores':
        return <Trophy size={64} className="text-slate-300" />;
      case 'fines':
        return <Banknote size={64} className="text-slate-300" />;
      default:
        return <FileQuestion size={64} className="text-slate-300" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Icon */}
      <div className="mb-4">
        {icon || getDefaultIcon()}
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-slate-700 mb-2">
        {title}
      </h3>

      {/* Description */}
      <p className="text-slate-500 max-w-md mb-6">
        {description}
      </p>

      {/* Action Button */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn btn-primary gap-2"
        >
          <Plus size={18} />
          {actionLabel}
        </button>
      )}
    </div>
  );
};

// Predefined empty states for common scenarios
export const NoPlayersEmptyState: React.FC<{ onAddPlayer?: () => void }> = ({ onAddPlayer }) => (
  <EmptyState
    type="players"
    title="No Players Yet"
    description="Get started by adding players to your golf league. You'll need at least one player to begin tracking scores."
    actionLabel={onAddPlayer ? "Add First Player" : undefined}
    onAction={onAddPlayer}
  />
);

export const NoRoundsEmptyState: React.FC<{ onAddRound?: () => void }> = ({ onAddRound }) => (
  <EmptyState
    type="rounds"
    title="No Rounds Scheduled"
    description="Create your first round to start tracking scores. Select a golf course, set a date, and invite players to compete."
    actionLabel={onAddRound ? "Create First Round" : undefined}
    onAction={onAddRound}
  />
);

export const NoScoresEmptyState: React.FC = () => (
  <EmptyState
    type="scores"
    title="No Scores Recorded"
    description="Scores will appear here once players complete rounds. The leaderboard will update automatically as scores are entered."
  />
);

export const NoFinesEmptyState: React.FC<{ onAddFine?: () => void }> = ({ onAddFine }) => (
  <EmptyState
    type="fines"
    title="No Fines Assigned"
    description="No fines have been assigned for this round yet. Select a player and fine type to get started."
    actionLabel={onAddFine ? "Assign Fine" : undefined}
    onAction={onAddFine}
  />
);

export const NoSearchResultsEmptyState: React.FC<{ searchTerm: string }> = ({ searchTerm }) => (
  <EmptyState
    title="No Results Found"
    description={`We couldn't find anything matching "${searchTerm}". Try adjusting your search terms.`}
  />
);
