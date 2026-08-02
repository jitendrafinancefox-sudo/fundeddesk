# Changelog

All notable architecture changes are recorded here. This changelog was introduced after the initial terminal rebuild and therefore documents the completed Phase 1 and Phase 2 work retrospectively.

## Phase 3 — Viewport engine subsystem

### Created

- `components/chart/engine/ViewportEngine.js` — independent infinite pan/zoom, visible-range, and price/pixel conversion engine.
- `components/chart/engine/CoordinateTransform.js` — stable pixel/time/price conversion layer.
- `components/chart/engine/VisibleRangeManager.js` — visible candle and drawing query helpers.

### Modified

- `stores/viewportStore.js` — changed from a singleton viewport snapshot to chart-keyed viewport snapshots.
- `stores/drawingStore.js` — documented and added symbol/timeframe drawing scopes; persisted drawing state is now explicitly data-coordinate based.

## Phase 3 — Render pipeline and history subsystem

### Created

- `components/chart/engine/RenderPipeline.js` — animation-frame render scheduler with dirty-region invalidation.
- `components/chart/renderers/GridRenderer.js` — grid layer renderer.
- `components/chart/renderers/CandleRenderer.js` — candle layer renderer.
- `components/chart/renderers/DrawingRenderer.js` — data-anchor drawing layer renderer.
- `components/chart/renderers/IndicatorRenderer.js` — indicator layer renderer.
- `components/chart/renderers/SelectionRenderer.js` — drawing-selection overlay renderer.
- `components/chart/renderers/CrosshairRenderer.js` — crosshair overlay renderer.
- `components/chart/renderers/AxisRenderer.js` — price-axis renderer.
- `components/chart/renderers/CursorRenderer.js` — cursor label renderer.
- `components/chart/renderers/OverlayRenderer.js` — generic overlay layer renderer.

### Modified

- `components/chart/HistoryManager.js` — added grouped/batched history transactions, cancellation, clear, undo, and redo behavior.

## Phase 3 — Canvas chart engine integration

### Created

- `components/chart/engine/CanvasChartEngine.js` — provider-independent chart runtime that coordinates viewport snapshots and render layers through stores.

### Modified

- `components/chart/engine/RenderPipeline.js` — added base-versus-overlay layer scheduling so crosshair updates do not redraw candles or the grid.
- `components/chart/DrawingEngine.js` — changed drawing creation to the stable `{ symbol, timeframe, drawingType, anchorPoints }` model.
- `components/chart/ChartCanvas.js` — replaced the Lightweight Charts rendering path with the new canvas engine, data-coordinate drawing persistence, pan/zoom, crosshair, and provider-neutral candle input.
- `components/terminal/TradingTerminal.js` — supplies stable symbol/timeframe isolation keys to the chart engine.

## Phase 3 — Drawing domain and extensibility subsystem

### Created

- `components/chart/engine/DrawingSchema.js` — validates the canonical data-coordinate drawing model and supported tool identities.
- `components/chart/engine/ToolRegistry.js` — independent registry for current and future chart tools.
- `components/chart/engine/SnappingEngine.js` — optional OHLC magnet/snapping logic.
- `components/chart/engine/ReplayController.js` — provider-neutral replay state machine.

### Modified

- `components/chart/DrawingEngine.js` — now creates validated stable drawing records with no screen-coordinate persistence.
- `components/chart/HistoryManager.js` — upgraded from snapshots to command-based undo/redo, grouping, and batch actions.
- `components/chart/SelectionEngine.js` — now hit-tests canonical anchor points through the coordinate transform.

## Phase 4 — Candle and viewport interaction subsystem

### Created

- `components/chart/engine/InteractionController.js` — velocity-based inertia pan and cursor-centered zoom gesture controller.

### Modified

- `services/candleAggregator.js` — retains candle volume during normalization.
- `components/chart/engine/VisibleRangeManager.js` — added binary-search candle index lookup.
- `components/chart/engine/ViewportEngine.js` — added time conversion helpers.
- `components/chart/renderers/CandleRenderer.js` — added dense-data rendering path and visible-range-only painting.
- `components/chart/engine/CanvasChartEngine.js` — added partial last-candle update support.
- `components/chart/ChartCanvas.js` — connected inertia pan and cursor-centered wheel zoom.

## Phase 4 — Indicator subsystem

### Created

- `components/chart/engine/IndicatorCalculations.js` — incremental-safe SMA, EMA, VWAP, volume, RSI, and MACD calculations.

### Modified

- `components/chart/renderers/IndicatorRenderer.js` — added actual line, volume, RSI pane, MACD signal, and histogram painting.
- `components/chart/ChartCanvas.js` — calculates and submits real indicator data to the chart engine after candle history loads.

## Phase 4 — Drawing interaction subsystem

### Created

- `components/chart/engine/DrawingInteraction.js` — hover/hit detection, selection, multiselect, drag, anchor resize, delete, duplicate, copy, and paste behavior for data-coordinate drawings.

### Modified

- `components/chart/engine/CanvasChartEngine.js` — added selection state rendering support.
- `components/chart/renderers/DrawingRenderer.js` — implemented vertical lines, rays, extended lines, and arrowheads in addition to trend/horizontal/rectangle/text drawing rendering.
- `components/chart/ChartCanvas.js` — connected drawing selection/editing and keyboard clipboard/delete commands.

### Modified

- `components/chart/engine/DrawingSchema.js` and `components/chart/engine/ToolRegistry.js` — added vertical line, ray, and extended-line tool identities.
- `components/terminal/LeftToolbar.js` — exposed the new production drawing tools in the terminal toolbar.

### Modified

- `components/chart/engine/RenderPipeline.js` — clips and clears dirty overlay regions before rendering them.
- `components/chart/engine/CanvasChartEngine.js` — crosshair now snaps pixel-perfectly to candle close/time and invalidates both old and new overlay regions.

### Phase completion

- Implemented real canvas rendering and interaction behavior for visible candles, data-coordinate drawings, crosshair snapping, inertia pan, cursor-centered zoom, and all requested indicators.
- `npm run build` passed after each Phase 4 subsystem; a final verification build follows this changelog update.

### Phase completion

- Implemented an independent canvas chart runtime with infinite pan/zoom, visible-object queries, time/price coordinate transforms, symbol/timeframe drawing isolation, layered rendering, and overlay-only redraw scheduling.
- Kept Angel One access behind `services/marketData.js`; no chart-engine module calls Angel APIs.
- `npm run build` completed successfully after every Phase 3 subsystem and again at phase completion.

## Phase 2 — Canonical terminal migration

### Modified

- `app/portal/terminal/page.js` — replaced the monolithic terminal implementation with a thin route wrapper around the canonical `TradingTerminal` composition.
- `components/chart/ChartCanvas.js` — added relay-history rendering, chart lifecycle integration, and persisted interactive drawing overlay support.
- `components/terminal/TradingTerminal.js` — added/updated the canonical terminal composition with Angel relay market data, simulated orders/positions, SL/TP checks, risk display, option chain, watchlist, chart controls, and fullscreen behavior.

### Deleted and replaced

- `app/india/page.js` — removed the duplicate Angel terminal implementation and replaced it with a redirect to `/portal/terminal`, preserving legacy entry points while establishing one canonical Angel terminal.

### Phase completion

- `npm run build` completed successfully after migration.
- The only build warning is the pre-existing Google Fonts stylesheet download/optimization warning caused by unavailable network access during the build.

## Phase 1 — Terminal architecture foundation

### Created: stores

- `stores/createStore.js` — minimal external-store primitive.
- `stores/chartStore.js` — chart runtime state.
- `stores/viewportStore.js` — viewport/crosshair state.
- `stores/drawingStore.js` — chart-keyed drawing state.
- `stores/tradingStore.js` — terminal trading state.

### Created: services

- `services/marketData.js` — configurable Angel relay client; defaults to the existing `http://localhost:5001` contract.
- `services/websocket.js` — provider-neutral WebSocket subscription lifecycle.
- `services/candleAggregator.js` — candle normalization and tick aggregation utilities.
- `services/drawingPersistence.js` — browser-local drawing persistence.

### Created: hooks

- `hooks/useStore.js` — React adapter for external stores.
- `hooks/useMarketData.js` — Angel relay health and option-chain polling hook.
- `hooks/useOrders.js` — simulated order/position mutation boundary.
- `hooks/useChart.js` — imperative Lightweight Charts lifecycle hook.

### Created: chart modules

- `components/chart/ChartCanvas.js` — reusable candle-chart surface.
- `components/chart/ChartEngine.js` — Lightweight Charts setup and teardown.
- `components/chart/Renderer.js` — canvas drawing renderer.
- `components/chart/Viewport.js` — visible-range binding helper.
- `components/chart/CoordinateSystem.js` — chart/data coordinate conversion.
- `components/chart/Crosshair.js` — crosshair binding helper.
- `components/chart/PriceScale.js` — price-scale sizing constant.
- `components/chart/TimeScale.js` — time-scale sizing constant.
- `components/chart/CandleSeries.js` — candle-series update helpers.
- `components/chart/DrawingEngine.js` — drawing creation lifecycle.
- `components/chart/DrawingStore.js` — chart drawing store façade.
- `components/chart/SelectionEngine.js` — drawing hit-testing helper.
- `components/chart/HistoryManager.js` — undo/redo history primitive.
- `components/chart/IndicatorEngine.js` — simple moving-average calculation primitive.

### Created: terminal modules

- `components/terminal/TerminalLayout.js` — terminal page composition shell.
- `components/terminal/TopToolbar.js` — market/account/status toolbar.
- `components/terminal/LeftToolbar.js` — drawing-tool toolbar.
- `components/terminal/RightSidebar.js` — sidebar composition boundary.
- `components/terminal/BottomPanel.js` — bottom-panel composition boundary.
- `components/terminal/Watchlist.js` — watchlist renderer.
- `components/terminal/OrderPanel.js` — simulated order ticket modal.
- `components/terminal/PositionPanel.js` — open-position renderer.
- `components/terminal/TradingTerminal.js` — canonical terminal feature composition.

### Phase completion

- `npm run build` completed successfully before the Phase 2 migration.

## Documentation

### Created before implementation

- `PROJECT_ANALYSIS.md` — project architecture audit.
- `ARCHITECTURE_PLAN.md` — target architecture plan.
- `REFACTOR_PLAN.md` — staged refactor plan.
- `TASK_LIST.md` — prioritized implementation checklist.
