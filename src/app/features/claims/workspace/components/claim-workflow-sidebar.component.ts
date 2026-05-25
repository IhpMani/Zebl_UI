import { ChangeDetectionStrategy, Component } from '@angular/core';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ClaimWorkspaceStateService } from '../../services/claim-workspace-state.service';
import { ClaimContextualActionsService, ClaimWorkflowAction } from '../../services/claim-contextual-actions.service';

@Component({
  selector: 'app-claim-workflow-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './claim-workflow-sidebar.component.html',
  styleUrls: ['../claim-workspace.shared.css']
})
export class ClaimWorkflowSidebarComponent {
  actions$ = combineLatest([this.state.header$]).pipe(
    map(([h]) => this.actions.buildActions(h))
  );

  constructor(
    private readonly state: ClaimWorkspaceStateService,
    private readonly actions: ClaimContextualActionsService,
    private readonly router: Router
  ) {}

  run(a: ClaimWorkflowAction): void {
    if (!a.route) return;
    const segments = a.route.replace(/^\//, '').split('/').filter(Boolean);
    void this.router.navigate(segments, { queryParams: a.queryParams });
  }
}
