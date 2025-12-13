/**
 * UX Components Demo
 *
 * This file demonstrates how to use the new UX components.
 * You can import this temporarily to see them in action.
 */

import React, { useState } from 'react';
import {
  LoadingSkeleton,
  DashboardSkeleton,
  FormSkeleton,
  useConfirm,
  NoPlayersEmptyState,
  NoRoundsEmptyState,
  NoScoresEmptyState,
  EmptyState
} from './common';
import { Trophy } from 'lucide-react';

export const UXDemo: React.FC = () => {
  const [showLoading, setShowLoading] = useState(false);
  const { confirm, ConfirmDialogComponent } = useConfirm();

  const handleDangerousAction = () => {
    confirm(
      'Delete Everything?',
      'This will delete all your data. This action cannot be undone!',
      () => {
        alert('Deleted! (Just kidding, this is a demo)');
      },
      'danger'
    );
  };

  const handleWarning = () => {
    confirm(
      'Are you sure?',
      'This action may have consequences.',
      () => {
        alert('Confirmed!');
      },
      'warning'
    );
  };

  return (
    <div className="p-8 space-y-12">
      <h1 className="text-3xl font-bold">UX Components Demo</h1>

      {/* Loading Skeletons Section */}
      <section>
        <h2 className="text-2xl font-bold mb-4">1. Loading Skeletons</h2>
        <button
          onClick={() => setShowLoading(!showLoading)}
          className="btn btn-primary mb-4"
        >
          {showLoading ? 'Hide' : 'Show'} Loading State
        </button>

        {showLoading ? (
          <div className="space-y-8">
            <div>
              <h3 className="font-semibold mb-2">Text Skeleton</h3>
              <LoadingSkeleton type="text" count={3} />
            </div>

            <div>
              <h3 className="font-semibold mb-2">Card Skeleton</h3>
              <LoadingSkeleton type="card" count={2} />
            </div>

            <div>
              <h3 className="font-semibold mb-2">Table Skeleton</h3>
              <LoadingSkeleton type="table" count={5} />
            </div>

            <div>
              <h3 className="font-semibold mb-2">Avatar Skeleton</h3>
              <LoadingSkeleton type="avatar" count={5} />
            </div>

            <div>
              <h3 className="font-semibold mb-2">Full Dashboard Skeleton</h3>
              <DashboardSkeleton />
            </div>

            <div>
              <h3 className="font-semibold mb-2">Form Skeleton</h3>
              <FormSkeleton />
            </div>
          </div>
        ) : (
          <p className="text-slate-500 italic">Click the button to see loading skeletons</p>
        )}
      </section>

      {/* Confirmation Dialogs Section */}
      <section>
        <h2 className="text-2xl font-bold mb-4">2. Confirmation Dialogs</h2>
        <div className="flex gap-4">
          <button onClick={handleDangerousAction} className="btn btn-error">
            Dangerous Action
          </button>
          <button onClick={handleWarning} className="btn btn-warning">
            Warning Action
          </button>
        </div>
      </section>

      {/* Empty States Section */}
      <section>
        <h2 className="text-2xl font-bold mb-4">3. Empty States</h2>
        <div className="space-y-8">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="font-semibold">No Players</h3>
              <NoPlayersEmptyState onAddPlayer={() => alert('Add player clicked!')} />
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="font-semibold">No Rounds</h3>
              <NoRoundsEmptyState onAddRound={() => alert('Add round clicked!')} />
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="font-semibold">No Scores</h3>
              <NoScoresEmptyState />
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="font-semibold">Custom Empty State</h3>
              <EmptyState
                icon={<Trophy size={64} className="text-emerald-500" />}
                title="You're All Set!"
                description="This is a custom empty state with your own icon, title, and description."
                actionLabel="Take Action"
                onAction={() => alert('Custom action!')}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Usage Tips */}
      <section>
        <h2 className="text-2xl font-bold mb-4">💡 Usage Tips</h2>
        <div className="prose">
          <ul>
            <li><strong>Loading Skeletons:</strong> Replace spinners with skeletons for better UX</li>
            <li><strong>Confirmations:</strong> Use before any destructive action (delete, reset)</li>
            <li><strong>Empty States:</strong> Show when lists/tables have no data</li>
          </ul>
        </div>
      </section>

      {/* Render confirmation dialog */}
      <ConfirmDialogComponent />
    </div>
  );
};

export default UXDemo;
