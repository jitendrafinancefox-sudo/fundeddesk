# FundedDesk — Project Snapshot
Generated: Fri Aug  7 19:44:25 IST 2026

## 1. Poori file list (structure)
```
./app/about/page.js
./app/admin/page.js
./app/api/news/route.js
./app/blog/[slug]/page.js
./app/blog/page.js
./app/blog/posts.js
./app/challenges/page.js
./app/dashboard/page.js
./app/faq/page.js
./app/forgot-password/page.js
./app/india/page.js
./app/layout.js
./app/login/page.js
./app/page.js
./app/portal/accounts/page.js
./app/portal/affiliate/page.js
./app/portal/analytics/calendar/page.js
./app/portal/analytics/heatmap/page.js
./app/portal/analytics/news/page.js
./app/portal/coupons/page.js
./app/portal/layout.js
./app/portal/leaderboard/page.js
./app/portal/page.js
./app/portal/payouts/page.js
./app/portal/privacy/page.js
./app/portal/settings/page.js
./app/portal/support/page.js
./app/portal/terminal/page.js
./app/reset-password/page.js
./app/rules/page.js
./app/signup/page.js
./app/terminal/page.js
./app/tv-chart/page.js
./app/web-terminal-v2/components/chart/context-menu/chart-context-menu.tsx
./app/web-terminal-v2/components/chart/context-menu/index.ts
./app/web-terminal-v2/components/chart/core/chart-canvas.tsx
./app/web-terminal-v2/components/chart/core/index.ts
./app/web-terminal-v2/components/chart/crosshair/crosshair-overlay.tsx
./app/web-terminal-v2/components/chart/crosshair/index.ts
./app/web-terminal-v2/components/chart/drawings/drawing-layer.tsx
./app/web-terminal-v2/components/chart/drawings/index.ts
./app/web-terminal-v2/components/chart/events/event-catcher.tsx
./app/web-terminal-v2/components/chart/events/index.ts
./app/web-terminal-v2/components/chart/grid/grid-layer.tsx
./app/web-terminal-v2/components/chart/grid/index.ts
./app/web-terminal-v2/components/chart/overlay/chart-overlay.tsx
./app/web-terminal-v2/components/chart/overlay/index.ts
./app/web-terminal-v2/components/chart/price-axis/index.ts
./app/web-terminal-v2/components/chart/price-axis/price-axis.tsx
./app/web-terminal-v2/components/chart/scales/index.ts
./app/web-terminal-v2/components/chart/scales/scale-manager.tsx
./app/web-terminal-v2/components/chart/selection/index.ts
./app/web-terminal-v2/components/chart/selection/selection-layer.tsx
./app/web-terminal-v2/components/chart/time-axis/index.ts
./app/web-terminal-v2/components/chart/time-axis/time-axis.tsx
./app/web-terminal-v2/components/chart/utils/chart-utils.ts
./app/web-terminal-v2/components/chart/utils/index.ts
./app/web-terminal-v2/components/chart/viewport/index.ts
./app/web-terminal-v2/components/chart/viewport/viewport-controller.tsx
./app/web-terminal-v2/components/common/index.ts
./app/web-terminal-v2/components/common/placeholder.tsx
./app/web-terminal-v2/components/terminal/account-manager/account-manager.tsx
./app/web-terminal-v2/components/terminal/account-manager/index.ts
./app/web-terminal-v2/components/terminal/bottom-panel/bottom-panel.tsx
./app/web-terminal-v2/components/terminal/bottom-panel/index.ts
./app/web-terminal-v2/components/terminal/option-chain/index.ts
./app/web-terminal-v2/components/terminal/option-chain/option-chain.tsx
./app/web-terminal-v2/components/terminal/order-panel/index.ts
./app/web-terminal-v2/components/terminal/order-panel/order-panel.tsx
./app/web-terminal-v2/components/terminal/sidebar/index.ts
./app/web-terminal-v2/components/terminal/sidebar/sidebar.tsx
./app/web-terminal-v2/components/terminal/topbar/index.ts
./app/web-terminal-v2/components/terminal/topbar/topbar.tsx
./app/web-terminal-v2/components/terminal/watchlist/index.ts
./app/web-terminal-v2/components/terminal/watchlist/watchlist.tsx
./app/web-terminal-v2/components/terminal/workspace/index.ts
./app/web-terminal-v2/components/terminal/workspace/workspace-grid.tsx
./app/web-terminal-v2/engine/broker/broker-adapter.ts
./app/web-terminal-v2/engine/broker/index.ts
./app/web-terminal-v2/engine/chart/chart-instance.ts
./app/web-terminal-v2/engine/chart/index.ts
./app/web-terminal-v2/engine/drawing/drawing-factory.ts
./app/web-terminal-v2/engine/drawing/index.ts
./app/web-terminal-v2/engine/events/event-bus.ts
./app/web-terminal-v2/engine/events/index.ts
./app/web-terminal-v2/engine/layout/index.ts
./app/web-terminal-v2/engine/layout/layout-engine.ts
./app/web-terminal-v2/engine/storage/index.ts
./app/web-terminal-v2/engine/storage/storage-engine.ts
./app/web-terminal-v2/engine/theme/index.ts
./app/web-terminal-v2/engine/theme/palettes/dark.ts
./app/web-terminal-v2/engine/theme/palettes/index.ts
./app/web-terminal-v2/engine/theme/palettes/light.ts
./app/web-terminal-v2/engine/theme/theme-provider.tsx
./app/web-terminal-v2/engine/theme/theme-tokens.ts
./app/web-terminal-v2/engine/workspace/index.ts
./app/web-terminal-v2/engine/workspace/workspace-engine.ts
./app/web-terminal-v2/hooks/index.ts
./app/web-terminal-v2/hooks/use-chart.ts
./app/web-terminal-v2/hooks/use-layout.ts
./app/web-terminal-v2/hooks/use-terminal-bootstrap.ts
./app/web-terminal-v2/layout.tsx
./app/web-terminal-v2/page.tsx
./app/web-terminal-v2/services/index.ts
./app/web-terminal-v2/services/query/client.ts
./app/web-terminal-v2/services/supabase/client.ts
./app/web-terminal-v2/stores/account-store.ts
./app/web-terminal-v2/stores/chart-store.ts
./app/web-terminal-v2/stores/drawing-store.ts
./app/web-terminal-v2/stores/index.ts
./app/web-terminal-v2/stores/layout-store.ts
./app/web-terminal-v2/stores/option-chain-store.ts
./app/web-terminal-v2/stores/order-store.ts
./app/web-terminal-v2/stores/settings-store.ts
./app/web-terminal-v2/stores/theme-store.ts
./app/web-terminal-v2/stores/watchlist-store.ts
./app/web-terminal-v2/stores/workspace-store.ts
./app/web-terminal-v2/styles/design-tokens.ts
./app/web-terminal-v2/types/account.ts
./app/web-terminal-v2/types/broker.ts
./app/web-terminal-v2/types/chart.ts
./app/web-terminal-v2/types/drawing.ts
./app/web-terminal-v2/types/events.ts
./app/web-terminal-v2/types/index.ts
./app/web-terminal-v2/types/layout-types.ts
./app/web-terminal-v2/types/option-chain.ts
./app/web-terminal-v2/types/order.ts
./app/web-terminal-v2/types/theme.ts
./app/web-terminal-v2/types/watchlist.ts
./app/web-terminal-v2/types/workspace.ts
./app/web-terminal-v2/utils/cn.ts
./app/web-terminal-v2/utils/id.ts
./app/web-terminal-v2/utils/index.ts
./app/web-terminal/page.js
./components/chart-tv/overlay/OverlayCursor.js
./components/chart-tv/overlay/OverlayEvents.js
./components/chart-tv/overlay/OverlayHandles.js
./components/chart-tv/overlay/OverlayHistory.js
./components/chart-tv/overlay/OverlayHitTest.js
./components/chart-tv/overlay/OverlayProperties.js
./components/chart-tv/overlay/OverlayRenderer.js
./components/chart-tv/overlay/OverlayRoot.js
./components/chart-tv/overlay/OverlaySelection.js
./components/chart-tv/overlay/OverlaySerialization.js
./components/chart-tv/overlay/OverlaySnapping.js
./components/chart-tv/overlay/OverlayViewport.js
./components/chart-tv/TVChart.js
./components/chart-tv/TVChartContainer.js
./components/chart-tv/TVChartCrosshair.js
./components/chart-tv/TVChartEvents.js
./components/chart-tv/TVChartResize.js
./components/chart-tv/TVChartSeries.js
./components/chart-tv/TVChartSync.js
./components/chart-tv/TVChartTheme.js
./components/chart/ChartCanvas.js
./components/chart/drawing/BezierGeometry.js
./components/chart/drawing/BrushEngine.js
./components/chart/drawing/BrushGeometry.js
./components/chart/drawing/BrushRenderer.js
./components/chart/drawing/BrushSerializer.js
./components/chart/drawing/BrushSimplifier.js
./components/chart/drawing/ChannelGeometry.js
./components/chart/drawing/DrawingDefinitions.js
./components/chart/drawing/DrawingManager.js
./components/chart/drawing/EventBus.js
./components/chart/drawing/FibBase.js
./components/chart/drawing/FibGeometry.js
./components/chart/drawing/FibHitTester.js
./components/chart/drawing/FibLabelRenderer.js
./components/chart/drawing/FibLevelManager.js
./components/chart/drawing/FibRenderer.js
./components/chart/drawing/FibSerializer.js
./components/chart/drawing/FontManager.js
./components/chart/drawing/GeometryEngine.js
./components/chart/drawing/GeometryPrimitives.js
./components/chart/drawing/LabelRenderer.js
./components/chart/drawing/LayerManager.js
./components/chart/drawing/ObjectRegistry.js
./components/chart/drawing/PathHitTester.js
./components/chart/drawing/PositionGeometry.js
./components/chart/drawing/PositionHitTester.js
./components/chart/drawing/PositionRenderer.js
./components/chart/drawing/PositionSerializer.js
./components/chart/drawing/RiskCalculator.js
./components/chart/drawing/SelectionManager.js
./components/chart/drawing/SerializationManager.js
./components/chart/drawing/ShapeGeometry.js
./components/chart/drawing/SpatialIndex.js
./components/chart/drawing/StrokeSmoother.js
./components/chart/drawing/TextGeometry.js
./components/chart/drawing/TextHitTester.js
./components/chart/drawing/TextLayoutEngine.js
./components/chart/drawing/TextRenderer.js
./components/chart/drawing/TextSerializer.js
./components/chart/drawing/ToolManager.js
./components/chart/engine/CanvasChartEngine.js
./components/chart/engine/CoordinateTransform.js
./components/chart/engine/coords/AxisConstants.js
./components/chart/engine/coords/CoordinateEngine.js
./components/chart/engine/coords/CoordinateUtils.js
./components/chart/engine/coords/PriceScale.js
./components/chart/engine/coords/ProjectionService.js
./components/chart/engine/coords/TimeScale.js
./components/chart/engine/coords/ViewportTransformer.js
./components/chart/engine/DrawingInteraction.js
./components/chart/engine/DrawingSchema.js
./components/chart/engine/IndicatorCalculations.js
./components/chart/engine/InteractionController.js
./components/chart/engine/RenderPipeline.js
./components/chart/engine/SnappingEngine.js
./components/chart/engine/ThemeManager.js
./components/chart/engine/ViewportEngine.js
./components/chart/engine/VisibleRangeManager.js
./components/chart/HistoryManager.js
./components/chart/IndicatorEngine.js
./components/chart/interaction/CursorManager.js
./components/chart/interaction/HandleGeometry.js
./components/chart/interaction/HitTestEngine.js
./components/chart/interaction/HoverManager.js
./components/chart/interaction/KeyboardShortcutManager.js
./components/chart/renderers/AxisRenderer.js
./components/chart/renderers/CandleRenderer.js
./components/chart/renderers/ChannelRenderer.js
./components/chart/renderers/CrosshairRenderer.js
./components/chart/renderers/CursorRenderer.js
./components/chart/renderers/DrawingRenderer.js
./components/chart/renderers/FibRenderer.js
./components/chart/renderers/GridRenderer.js
./components/chart/renderers/HandleRenderer.js
./components/chart/renderers/IndicatorRenderer.js
./components/chart/renderers/OverlayRenderer.js
./components/chart/renderers/TimeAxisRenderer.js
./components/chart/renderers/ZoneRenderer.js
./components/chart/ui/ChartContextMenu.js
./components/chart/ui/DrawingFlyout.js
./components/chart/ui/DrawingManagerPanel.js
./components/chart/ui/PropertiesPanel.js
./components/Nav.js
./components/SiteBackground.js
./components/terminal/AccountManager.js
./components/terminal/AlertManager.js
./components/terminal/AlertNotifications.js
./components/terminal/ChartGrid.js
./components/terminal/ChartPane.js
./components/terminal/constants.js
./components/terminal/Hotkeys.js
./components/terminal/IndicatorMenu.js
./components/terminal/LayoutContext.js
./components/terminal/LeftToolbar.js
./components/terminal/OptionChainModal.js
./components/terminal/OrderBook.js
./components/terminal/OrderManager.js
./components/terminal/OrderPanel.js
./components/terminal/Panel.js
./components/terminal/PaneManager.js
./components/terminal/paneOps.js
./components/terminal/PositionManager.js
./components/terminal/RiskPanel.js
./components/terminal/ScalperPanel.js
./components/terminal/StatusBar.js
./components/terminal/TerminalActions.js
./components/terminal/TerminalDataLayer.js
./components/terminal/TerminalHeader.js
./components/terminal/TerminalRoot.js
./components/terminal/theme.js
./components/terminal/TradeHistory.js
./components/terminal/TradingTerminal.js
./components/terminal/tradingUI.js
./components/terminal/Watchlist.js
./components/terminal/Workspace.js
./components/ThemeToggle.js
./hooks/useMarketData.js
./lib/supabaseClient.js
./next-env.d.ts
./public/vendor/highcharts/annotations-advanced.js
./public/vendor/highcharts/highstock.js
./public/vendor/highcharts/indicators.js
./public/vendor/highcharts/price-indicator.js
./public/vendor/highcharts/rsi.js
./public/vendor/highcharts/stock-tools.js
./services/candleAggregator.js
./services/drawingPersistence.js
./services/marketData.js
./stores/PaneCanvasRegistry.js
./stores/PriceBus.js
./stores/TerminalStatus.js
./stores/TradingStore.js
./supabase/affiliate-coupons.sql
./supabase/analytics-support.sql
./supabase/plans-3tier-fix.sql
./supabase/schema.sql
./supabase/user-watchlist.sql
```

## 2. Har file ki line-count (kaunsi files real hain, kaunsi khaali stub)
```
    1168 ./app/page.js
     882 ./components/chart/engine/DrawingInteraction.js
     706 ./public/vendor/highcharts/stock-tools.js
     575 ./components/terminal/Watchlist.js
     570 ./components/terminal/TerminalHeader.js
     556 ./components/chart/drawing/DrawingDefinitions.js
     509 ./components/terminal/TradingTerminal.js
     506 ./stores/TradingStore.js
     499 ./components/terminal/OrderPanel.js
     436 ./components/chart/ChartCanvas.js
     435 ./components/terminal/OptionChainModal.js
     394 ./components/terminal/ChartPane.js
     353 ./app/tv-chart/page.js
     346 ./app/admin/page.js
     341 ./components/chart-tv/overlay/OverlayRoot.js
     340 ./components/terminal/paneOps.js
     332 ./components/terminal/LeftToolbar.js
     295 ./components/chart/ui/PropertiesPanel.js
     274 ./components/chart/ui/DrawingManagerPanel.js
     271 ./components/terminal/AlertManager.js
     248 ./components/chart-tv/overlay/OverlayEvents.js
     247 ./app/portal/layout.js
     223 ./components/chart/drawing/FibRenderer.js
     214 ./components/chart/drawing/ChannelGeometry.js
     213 ./components/chart/renderers/DrawingRenderer.js
     211 ./components/chart/renderers/TimeAxisRenderer.js
     204 ./app/challenges/page.js
     199 ./app/portal/page.js
     197 ./components/chart-tv/TVChart.js
     195 ./app/web-terminal-v2/engine/drawing/drawing-factory.ts
     193 ./components/terminal/TradeHistory.js
     191 ./components/terminal/AccountManager.js
     184 ./components/chart/drawing/TextRenderer.js
     184 ./app/dashboard/page.js
     179 ./components/chart/interaction/HandleGeometry.js
     178 ./components/chart/engine/coords/TimeScale.js
     175 ./components/SiteBackground.js
     174 ./components/chart/drawing/DrawingManager.js
     172 ./components/chart/renderers/HandleRenderer.js
     167 ./components/chart/drawing/FibGeometry.js
     166 ./components/terminal/PositionManager.js
     166 ./components/chart/engine/CanvasChartEngine.js
     165 ./components/terminal/PaneManager.js
     160 ./components/chart/drawing/BrushGeometry.js
     155 ./components/terminal/RiskPanel.js
     153 ./components/terminal/StatusBar.js
     153 ./components/chart/drawing/ToolManager.js
     153 ./components/chart/drawing/BrushEngine.js
     151 ./components/terminal/ChartGrid.js
     150 ./components/chart/renderers/CrosshairRenderer.js
     149 ./app/web-terminal-v2/stores/chart-store.ts
     148 ./components/terminal/OrderManager.js
     145 ./components/terminal/tradingUI.js
     141 ./components/chart/drawing/BezierGeometry.js
     140 ./components/chart/drawing/FibLevelManager.js
     139 ./components/terminal/TerminalDataLayer.js
     138 ./components/terminal/ScalperPanel.js
     136 ./components/chart/renderers/GridRenderer.js
     130 ./app/web-terminal-v2/styles/design-tokens.ts
     124 ./components/chart/drawing/BrushRenderer.js
     123 ./components/terminal/LayoutContext.js
     122 ./components/chart/renderers/AxisRenderer.js
     122 ./components/chart/drawing/TextGeometry.js
     121 ./components/chart/drawing/ShapeGeometry.js
     120 ./components/terminal/OrderBook.js
     119 ./components/terminal/Panel.js
     115 ./components/chart/ui/DrawingFlyout.js
     114 ./app/web-terminal-v2/types/drawing.ts
     114 ./app/portal/affiliate/page.js
     110 ./components/terminal/Workspace.js
     109 ./components/chart/engine/InteractionController.js
     107 ./components/chart/drawing/PositionRenderer.js
     107 ./app/portal/analytics/heatmap/page.js
     106 ./components/chart-tv/overlay/OverlayRenderer.js
     105 ./app/web-terminal-v2/stores/workspace-store.ts
     103 ./app/portal/support/page.js
      99 ./components/chart-tv/overlay/OverlayViewport.js
      96 ./app/web-terminal-v2/engine/storage/storage-engine.ts
      95 ./components/chart/engine/coords/PriceScale.js
      94 ./app/web-terminal-v2/stores/drawing-store.ts
      93 ./components/chart-tv/TVChartContainer.js
      93 ./app/portal/privacy/page.js
      92 ./app/portal/payouts/page.js
      91 ./components/chart/drawing/LabelRenderer.js
      91 ./app/reset-password/page.js
      89 ./components/chart/drawing/SerializationManager.js
      89 ./components/chart-tv/TVChartSync.js
      89 ./app/portal/analytics/calendar/page.js
      88 ./components/chart/engine/ThemeManager.js
      87 ./components/chart/engine/coords/CoordinateEngine.js
      87 ./app/web-terminal-v2/engine/chart/chart-instance.ts
      86 ./components/chart/drawing/BrushSimplifier.js
      85 ./components/chart/engine/RenderPipeline.js
      85 ./components/chart/drawing/FibHitTester.js
      85 ./components/chart-tv/TVChartTheme.js
      85 ./app/web-terminal-v2/stores/watchlist-store.ts
      82 ./app/web-terminal-v2/types/chart.ts
      81 ./components/terminal/AlertNotifications.js
      81 ./components/chart/ui/ChartContextMenu.js
      80 ./components/terminal/IndicatorMenu.js
      80 ./components/chart/interaction/HitTestEngine.js
      78 ./components/chart/drawing/FibLabelRenderer.js
      78 ./app/portal/leaderboard/page.js
      77 ./app/web-terminal-v2/hooks/use-terminal-bootstrap.ts
      77 ./app/portal/accounts/page.js
      73 ./components/chart/drawing/TextLayoutEngine.js
      73 ./app/web-terminal-v2/engine/workspace/workspace-engine.ts
      72 ./components/Nav.js
      71 ./app/portal/coupons/page.js
      69 ./components/chart/renderers/IndicatorRenderer.js
      69 ./app/portal/analytics/news/page.js
      68 ./components/chart/interaction/CursorManager.js
      67 ./components/terminal/theme.js
      67 ./app/web-terminal-v2/stores/order-store.ts
      66 ./app/web-terminal-v2/engine/layout/layout-engine.ts
      65 ./components/chart/engine/coords/CoordinateUtils.js
      61 ./app/about/page.js
      60 ./components/terminal/TerminalActions.js
      60 ./components/terminal/Hotkeys.js
      60 ./components/chart/drawing/PathHitTester.js
      59 ./app/web-terminal-v2/engine/events/event-bus.ts
      58 ./components/chart/drawing/FontManager.js
      58 ./app/blog/posts.js
      57 ./components/ThemeToggle.js
      57 ./components/chart/engine/coords/ProjectionService.js
      57 ./components/chart-tv/overlay/OverlaySelection.js
      56 ./stores/PriceBus.js
      56 ./components/chart/drawing/TextSerializer.js
      56 ./components/chart/drawing/RiskCalculator.js
      56 ./app/portal/settings/page.js
      54 ./components/chart/interaction/KeyboardShortcutManager.js
      54 ./components/chart/drawing/GeometryPrimitives.js
      54 ./components/chart/drawing/FibSerializer.js
      53 ./components/chart/drawing/BrushSerializer.js
      52 ./services/marketData.js
      52 ./app/web-terminal-v2/stores/settings-store.ts
      51 ./components/chart-tv/TVChartSeries.js
      50 ./components/chart/renderers/CandleRenderer.js
      50 ./components/chart/drawing/StrokeSmoother.js
      49 ./app/web-terminal-v2/types/events.ts
      48 ./app/blog/[slug]/page.js
      47 ./components/chart/IndicatorEngine.js
      47 ./app/signup/page.js
      47 ./app/api/news/route.js
      46 ./components/chart/drawing/LayerManager.js
      45 ./components/chart/drawing/SpatialIndex.js
      45 ./components/chart/drawing/FibBase.js
      45 ./app/web-terminal-v2/engine/theme/theme-provider.tsx
      44 ./components/chart/drawing/PositionGeometry.js
      43 ./app/blog/page.js
      42 ./app/rules/page.js
      41 ./app/forgot-password/page.js
      40 ./components/chart-tv/TVChartEvents.js
      39 ./app/layout.js
      38 ./components/chart/drawing/SelectionManager.js
      38 ./app/web-terminal-v2/stores/layout-store.ts
      38 ./app/login/page.js
      37 ./app/web-terminal-v2/types/theme.ts
      36 ./components/chart/renderers/ZoneRenderer.js
      36 ./components/chart/drawing/ObjectRegistry.js
      35 ./components/terminal/constants.js
      35 ./app/web-terminal-v2/stores/option-chain-store.ts
      34 ./components/chart/engine/coords/ViewportTransformer.js
      34 ./app/web-terminal-v2/types/broker.ts
      33 ./public/vendor/highcharts/annotations-advanced.js
      33 ./app/web-terminal-v2/types/order.ts
      32 ./components/chart-tv/TVChartCrosshair.js
      31 ./components/chart-tv/overlay/OverlayProperties.js
      31 ./components/chart-tv/overlay/OverlayHandles.js
      30 ./app/web-terminal-v2/stores/account-store.ts
      29 ./components/chart/drawing/GeometryEngine.js
      29 ./app/web-terminal-v2/types/account.ts
      29 ./app/web-terminal-v2/components/chart/utils/chart-utils.ts
      29 ./app/faq/page.js
      28 ./components/chart/engine/SnappingEngine.js
      27 ./stores/TerminalStatus.js
      27 ./public/vendor/highcharts/highstock.js
      26 ./app/web-terminal-v2/stores/theme-store.ts
      26 ./app/web-terminal-v2/engine/theme/theme-tokens.ts
      25 ./components/chart/drawing/PositionSerializer.js
      25 ./app/web-terminal-v2/types/option-chain.ts
      24 ./app/web-terminal-v2/types/layout-types.ts
      23 ./app/web-terminal-v2/types/workspace.ts
      22 ./components/terminal/TerminalRoot.js
      22 ./components/chart/interaction/HoverManager.js
      22 ./components/chart/HistoryManager.js
      21 ./components/chart/engine/VisibleRangeManager.js
      21 ./components/chart/drawing/TextHitTester.js
      21 ./app/web-terminal-v2/hooks/use-chart.ts
      20 ./components/chart/renderers/FibRenderer.js
      20 ./app/web-terminal-v2/services/query/client.ts
      19 ./components/chart/renderers/ChannelRenderer.js
      19 ./components/chart-tv/overlay/OverlayHistory.js
      19 ./app/web-terminal-v2/services/supabase/client.ts
      19 ./app/web-terminal-v2/engine/drawing/index.ts
      18 ./components/chart/drawing/PositionHitTester.js
      18 ./components/chart-tv/TVChartResize.js
      18 ./app/web-terminal-v2/components/common/placeholder.tsx
      17 ./app/web-terminal-v2/engine/broker/broker-adapter.ts
      16 ./stores/PaneCanvasRegistry.js
      16 ./hooks/useMarketData.js
      16 ./app/web-terminal-v2/hooks/use-layout.ts
      15 ./components/chart-tv/overlay/OverlaySerialization.js
      15 ./components/chart-tv/overlay/OverlayHitTest.js
      15 ./components/chart-tv/overlay/OverlayCursor.js
      15 ./app/web-terminal-v2/layout.tsx
      14 ./components/chart/drawing/EventBus.js
      13 ./public/vendor/highcharts/rsi.js
      13 ./public/vendor/highcharts/price-indicator.js
      13 ./public/vendor/highcharts/indicators.js
      13 ./app/web-terminal-v2/types/watchlist.ts
      13 ./app/web-terminal-v2/engine/layout/index.ts
      12 ./services/candleAggregator.js
      12 ./components/chart-tv/overlay/OverlaySnapping.js
      12 ./app/web-terminal-v2/engine/chart/index.ts
      11 ./app/web-terminal-v2/types/index.ts
      11 ./app/web-terminal-v2/stores/index.ts
      10 ./app/web-terminal-v2/engine/storage/index.ts
       9 ./components/chart/engine/CoordinateTransform.js
       9 ./app/web-terminal-v2/page.tsx
       9 ./app/web-terminal-v2/engine/workspace/index.ts
       9 ./app/web-terminal-v2/components/terminal/workspace/workspace-grid.tsx
       8 ./lib/supabaseClient.js
       8 ./components/chart/engine/ViewportEngine.js
       8 ./components/chart/engine/IndicatorCalculations.js
       8 ./components/chart/engine/DrawingSchema.js
       8 ./app/web-terminal/page.js
       7 ./components/chart/engine/coords/AxisConstants.js
       7 ./app/web-terminal-v2/utils/cn.ts
       7 ./app/web-terminal-v2/components/terminal/watchlist/watchlist.tsx
       7 ./app/web-terminal-v2/components/terminal/topbar/topbar.tsx
       7 ./app/web-terminal-v2/components/terminal/sidebar/sidebar.tsx
       7 ./app/web-terminal-v2/components/terminal/order-panel/order-panel.tsx
       7 ./app/web-terminal-v2/components/terminal/option-chain/option-chain.tsx
       7 ./app/web-terminal-v2/components/terminal/bottom-panel/bottom-panel.tsx
       7 ./app/web-terminal-v2/components/terminal/account-manager/account-manager.tsx
       7 ./app/web-terminal-v2/components/chart/viewport/viewport-controller.tsx
       7 ./app/web-terminal-v2/components/chart/time-axis/time-axis.tsx
       7 ./app/web-terminal-v2/components/chart/selection/selection-layer.tsx
       7 ./app/web-terminal-v2/components/chart/scales/scale-manager.tsx
       7 ./app/web-terminal-v2/components/chart/price-axis/price-axis.tsx
       7 ./app/web-terminal-v2/components/chart/overlay/chart-overlay.tsx
       7 ./app/web-terminal-v2/components/chart/grid/grid-layer.tsx
       7 ./app/web-terminal-v2/components/chart/events/event-catcher.tsx
       7 ./app/web-terminal-v2/components/chart/drawings/drawing-layer.tsx
       7 ./app/web-terminal-v2/components/chart/crosshair/crosshair-overlay.tsx
       7 ./app/web-terminal-v2/components/chart/core/chart-canvas.tsx
       7 ./app/web-terminal-v2/components/chart/context-menu/chart-context-menu.tsx
       7 ./app/terminal/page.js
       7 ./app/india/page.js
       6 ./services/drawingPersistence.js
       6 ./next-env.d.ts
       6 ./components/chart/renderers/CursorRenderer.js
       6 ./app/web-terminal-v2/utils/id.ts
       5 ./app/portal/terminal/page.js
       4 ./app/web-terminal-v2/hooks/index.ts
       4 ./app/web-terminal-v2/engine/theme/palettes/light.ts
       4 ./app/web-terminal-v2/engine/theme/palettes/dark.ts
       4 ./app/web-terminal-v2/engine/theme/index.ts
       2 ./components/chart/renderers/OverlayRenderer.js
       2 ./app/web-terminal-v2/utils/index.ts
       2 ./app/web-terminal-v2/services/index.ts
       2 ./app/web-terminal-v2/engine/theme/palettes/index.ts
       1 ./app/web-terminal-v2/engine/events/index.ts
       1 ./app/web-terminal-v2/engine/broker/index.ts
       1 ./app/web-terminal-v2/components/terminal/workspace/index.ts
       1 ./app/web-terminal-v2/components/terminal/watchlist/index.ts
       1 ./app/web-terminal-v2/components/terminal/topbar/index.ts
       1 ./app/web-terminal-v2/components/terminal/sidebar/index.ts
       1 ./app/web-terminal-v2/components/terminal/order-panel/index.ts
       1 ./app/web-terminal-v2/components/terminal/option-chain/index.ts
       1 ./app/web-terminal-v2/components/terminal/bottom-panel/index.ts
       1 ./app/web-terminal-v2/components/terminal/account-manager/index.ts
       1 ./app/web-terminal-v2/components/common/index.ts
       1 ./app/web-terminal-v2/components/chart/viewport/index.ts
       1 ./app/web-terminal-v2/components/chart/utils/index.ts
       1 ./app/web-terminal-v2/components/chart/time-axis/index.ts
       1 ./app/web-terminal-v2/components/chart/selection/index.ts
       1 ./app/web-terminal-v2/components/chart/scales/index.ts
       1 ./app/web-terminal-v2/components/chart/price-axis/index.ts
       1 ./app/web-terminal-v2/components/chart/overlay/index.ts
       1 ./app/web-terminal-v2/components/chart/grid/index.ts
       1 ./app/web-terminal-v2/components/chart/events/index.ts
       1 ./app/web-terminal-v2/components/chart/drawings/index.ts
       1 ./app/web-terminal-v2/components/chart/crosshair/index.ts
       1 ./app/web-terminal-v2/components/chart/core/index.ts
       1 ./app/web-terminal-v2/components/chart/context-menu/index.ts
```

## 3. Import graph — kaun kisko use kar raha hai (asli 'interlink' map)
```
./app/layout.js:2:import Nav from '@/components/Nav';
./app/layout.js:3:import SiteBackground from '@/components/SiteBackground';
./app/layout.js:4:import ThemeToggle from '@/components/ThemeToggle';
./app/portal/settings/page.js:3:import { supabase } from '@/lib/supabaseClient';
./app/portal/layout.js:5:import { supabase } from '@/lib/supabaseClient';
./app/portal/page.js:6:import { supabase, fmt } from '@/lib/supabaseClient';
./app/portal/terminal/page.js:1:import TradingTerminal from '@/components/terminal/TradingTerminal';
./app/portal/leaderboard/page.js:3:import { supabase, fmt } from '@/lib/supabaseClient';
./app/portal/coupons/page.js:4:import { supabase } from '@/lib/supabaseClient';
./app/portal/accounts/page.js:4:import { supabase, fmt } from '@/lib/supabaseClient';
./app/portal/support/page.js:3:import { supabase } from '@/lib/supabaseClient';
./app/portal/affiliate/page.js:4:import { supabase, fmt } from '@/lib/supabaseClient';
./app/portal/payouts/page.js:3:import { supabase, fmt } from '@/lib/supabaseClient';
./app/portal/analytics/calendar/page.js:3:import { supabase } from '@/lib/supabaseClient';
./app/portal/analytics/heatmap/page.js:3:import { marketData } from '@/services/marketData';
./app/signup/page.js:4:import { supabase } from '@/lib/supabaseClient';
./app/challenges/page.js:3:import { supabase, fmt } from '@/lib/supabaseClient';
./app/admin/page.js:3:import { supabase, fmt } from '@/lib/supabaseClient';
./app/admin/page.js:4:import ThemeToggle from '@/components/ThemeToggle';
./app/tv-chart/page.js:4:import TVChartContainer from '@/components/chart-tv/TVChartContainer';
./app/tv-chart/page.js:5:import { TV_TIMEFRAME_LABELS } from '@/components/chart-tv/TVChartSeries';
./app/tv-chart/page.js:6:import ChartContextMenu from '@/components/chart/ui/ChartContextMenu';
./app/tv-chart/page.js:7:import PropertiesPanel from '@/components/chart/ui/PropertiesPanel';
./app/tv-chart/page.js:8:import DrawingFlyout from '@/components/chart/ui/DrawingFlyout';
./app/tv-chart/page.js:9:import { isZoneType, isChannelType, isStrokeType, isPositionType, isTextType } from '@/components/chart/drawing/DrawingDefinitions';
./app/dashboard/page.js:4:import { supabase, fmt } from '@/lib/supabaseClient';
./app/forgot-password/page.js:4:import { supabase } from '@/lib/supabaseClient';
./app/reset-password/page.js:4:import { supabase } from '@/lib/supabaseClient';
./app/login/page.js:4:import { supabase } from '@/lib/supabaseClient';
./stores/TradingStore.js:4:import { marketData } from '@/services/marketData';
./stores/TradingStore.js:5:import { sma, ema, rsi, macd, vwap } from '@/components/chart/engine/IndicatorCalculations';
./components/chart-tv/TVChart.js:2:import { marketData } from '@/services/marketData';
./components/chart-tv/TVChart.js:3:import { normalizeCandles } from '@/services/candleAggregator';
./components/chart-tv/overlay/OverlaySnapping.js:2:import { snapAnchor } from '@/components/chart/engine/SnappingEngine';
./components/chart-tv/overlay/OverlayCursor.js:2:import { resolveCursor, createCursorManager } from '@/components/chart/interaction/CursorManager';
./components/chart-tv/overlay/OverlayHandles.js:2:import { HandleRenderer } from '@/components/chart/renderers/HandleRenderer';
./components/chart-tv/overlay/OverlayHandles.js:3:import { handleGeometry, nearestHandle } from '@/components/chart/interaction/HandleGeometry';
./components/chart-tv/overlay/OverlayProperties.js:2:import { textDefaults } from '@/components/chart/drawing/TextGeometry';
./components/chart-tv/overlay/OverlayProperties.js:3:import { isPositionType, isTextType } from '@/components/chart/drawing/DrawingDefinitions';
./components/chart-tv/overlay/OverlayHistory.js:2:import { createHistoryManager } from '@/components/chart/HistoryManager';
./components/chart-tv/overlay/OverlaySerialization.js:2:import { createSerializationManager } from '@/components/chart/drawing/SerializationManager';
./components/chart-tv/overlay/OverlayHitTest.js:2:import { createHitTestEngine } from '@/components/chart/interaction/HitTestEngine';
./components/chart-tv/overlay/OverlayRoot.js:2:import { createEventBus } from '@/components/chart/drawing/EventBus';
./components/chart-tv/overlay/OverlayRoot.js:3:import { createObjectRegistry } from '@/components/chart/drawing/ObjectRegistry';
./components/chart-tv/overlay/OverlayRoot.js:4:import { createLayerManager } from '@/components/chart/drawing/LayerManager';
./components/chart-tv/overlay/OverlayRoot.js:5:import { createToolManager } from '@/components/chart/drawing/ToolManager';
./components/chart-tv/overlay/OverlayRoot.js:6:import { createDrawing } from '@/components/chart/engine/DrawingSchema';
./components/chart-tv/overlay/OverlayRoot.js:7:import { createHoverManager } from '@/components/chart/interaction/HoverManager';
./components/chart-tv/overlay/OverlayRoot.js:8:import { DrawingInteraction } from '@/components/chart/engine/DrawingInteraction';
./components/chart-tv/overlay/OverlayRoot.js:9:import { isShapeType, isRegressionType, isPositionType, isTextType, normalizeShapeAnchors } from '@/components/chart/drawing/DrawingDefinitions';
./components/chart-tv/overlay/OverlayRoot.js:10:import { fitLinearRegression } from '@/components/chart/drawing/ChannelGeometry';
./components/chart-tv/overlay/OverlaySelection.js:2:import { createSelectionManager } from '@/components/chart/drawing/SelectionManager';
./components/chart-tv/overlay/OverlayRenderer.js:2:import { renderDrawing } from '@/components/chart/drawing/DrawingDefinitions';
./components/chart-tv/overlay/OverlayRenderer.js:3:import { themeTokens, alpha } from '@/components/chart/engine/ThemeManager';
./components/chart-tv/overlay/OverlayEvents.js:2:import { createKeyboardShortcutManager } from '@/components/chart/interaction/KeyboardShortcutManager';
./components/chart-tv/overlay/OverlayEvents.js:3:import { isZoneType, isChannelType, isPositionType, isTextType, isStrokeType } from '@/components/chart/drawing/DrawingDefinitions';
./components/chart/drawing/SerializationManager.js:2:import { drawingPersistence } from '@/services/drawingPersistence';
./components/chart/ChartCanvas.js:3:import { normalizeCandles } from '@/services/candleAggregator';
./components/chart/ChartCanvas.js:4:import { marketData } from '@/services/marketData';
./components/terminal/ChartPane.js:3:import ChartCanvas from '@/components/chart/ChartCanvas';
./components/terminal/ChartPane.js:4:import DrawingManagerPanel from '@/components/chart/ui/DrawingManagerPanel';
./components/terminal/ChartPane.js:9:import { terminalStatus } from '@/stores/TerminalStatus';
./components/terminal/AccountManager.js:3:import { useTradeState, fmtINR } from '@/stores/TradingStore';
./components/terminal/AlertManager.js:4:import { TradingStore, useTradeState } from '@/stores/TradingStore';
./components/terminal/AlertManager.js:5:import { drawingPersistence } from '@/services/drawingPersistence';
./components/terminal/AlertManager.js:6:import { drawingLabelFor } from '@/components/chart/drawing/DrawingDefinitions';
./components/terminal/TradeHistory.js:4:import { useTradeState, fmtINR } from '@/stores/TradingStore';
./components/terminal/TerminalDataLayer.js:3:import { useMarketData } from '@/hooks/useMarketData';
./components/terminal/TerminalDataLayer.js:4:import { supabase } from '@/lib/supabaseClient';
./components/terminal/TerminalDataLayer.js:5:import { marketData } from '@/services/marketData';
./components/terminal/TerminalDataLayer.js:6:import { PriceBus } from '@/stores/PriceBus';
./components/terminal/OrderManager.js:4:import { TradingStore, useTradeState } from '@/stores/TradingStore';
./components/terminal/StatusBar.js:3:import { terminalStatus } from '@/stores/TerminalStatus';
./components/terminal/StatusBar.js:5:import { marketData } from '@/services/marketData';
./components/terminal/LeftToolbar.js:11:import { loadManagerState, toggleFavorite } from '@/components/chart/drawing/DrawingManager';
./components/terminal/TerminalHeader.js:5:import { allStockSymbols } from '@/services/marketData';
./components/terminal/TerminalHeader.js:7:import { terminalStatus } from '@/stores/TerminalStatus';
./components/terminal/RiskPanel.js:4:import { usePrice } from '@/stores/PriceBus';
./components/terminal/RiskPanel.js:5:import { marginFor, lotSizeFor, fmtINR } from '@/stores/TradingStore';
./components/terminal/IndicatorMenu.js:4:import { INDICATORS } from '@/components/chart/IndicatorEngine';
./components/terminal/PaneManager.js:3:import { PriceBus } from '@/stores/PriceBus';
./components/terminal/Watchlist.js:4:import { allStockSymbols } from '@/services/marketData';
./components/terminal/OrderBook.js:4:import { usePrice } from '@/stores/PriceBus';
./components/terminal/AlertNotifications.js:4:import { TradingStore, useTradeState } from '@/stores/TradingStore';
./components/terminal/PositionManager.js:4:import { TradingStore, useTradeState, fmtINR, lotSizeFor } from '@/stores/TradingStore';
./components/terminal/TradingTerminal.js:4:import TerminalRoot from '@/components/terminal/TerminalRoot';
./components/terminal/TradingTerminal.js:5:import TerminalHeader from '@/components/terminal/TerminalHeader';
./components/terminal/TradingTerminal.js:6:import Workspace from '@/components/terminal/Workspace';
./components/terminal/TradingTerminal.js:7:import ChartGrid from '@/components/terminal/ChartGrid';
./components/terminal/TradingTerminal.js:8:import LeftToolbar from '@/components/terminal/LeftToolbar';
./components/terminal/TradingTerminal.js:9:import Watchlist from '@/components/terminal/Watchlist';
./components/terminal/TradingTerminal.js:10:import OrderPanel from '@/components/terminal/OrderPanel';
./components/terminal/TradingTerminal.js:11:import ScalperPanel from '@/components/terminal/ScalperPanel';
./components/terminal/TradingTerminal.js:12:import OptionChainModal from '@/components/terminal/OptionChainModal';
./components/terminal/TradingTerminal.js:13:import { PaneManagerProvider, usePaneManager, usePanePriceRef, usePanePrice } from '@/components/terminal/PaneManager';
./components/terminal/TradingTerminal.js:14:import { useLayout } from '@/components/terminal/LayoutContext';
./components/terminal/TradingTerminal.js:15:import TerminalDataLayer from '@/components/terminal/TerminalDataLayer';
./components/terminal/TradingTerminal.js:16:import TerminalActions from '@/components/terminal/TerminalActions';
./components/terminal/TradingTerminal.js:17:import AccountManager, { AccountSummary } from '@/components/terminal/AccountManager';
./components/terminal/TradingTerminal.js:18:import PositionManager from '@/components/terminal/PositionManager';
./components/terminal/TradingTerminal.js:19:import OrderManager from '@/components/terminal/OrderManager';
./components/terminal/TradingTerminal.js:20:import RiskPanel from '@/components/terminal/RiskPanel';
./components/terminal/TradingTerminal.js:21:import OrderBook from '@/components/terminal/OrderBook';
./components/terminal/TradingTerminal.js:22:import TradeHistory from '@/components/terminal/TradeHistory';
./components/terminal/TradingTerminal.js:23:import AlertManager from '@/components/terminal/AlertManager';
./components/terminal/TradingTerminal.js:24:import AlertNotifications from '@/components/terminal/AlertNotifications';
./components/terminal/TradingTerminal.js:25:import HotkeyManager from '@/components/terminal/Hotkeys';
./components/terminal/TradingTerminal.js:26:import StatusBar from '@/components/terminal/StatusBar';
./components/terminal/TradingTerminal.js:27:import { TradingStore } from '@/stores/TradingStore';
./components/Nav.js:5:import { supabase } from '@/lib/supabaseClient';
./components/Nav.js:6:import ThemeToggle from '@/components/ThemeToggle';
./hooks/useMarketData.js:2:import { marketData } from '@/services/marketData';
```

## 4. package.json
```json
{
  "name": "fundeddesk",
  "version": "2.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@highcharts/map-collection": "^2.3.3",
    "@supabase/supabase-js": "2.45.0",
    "@tanstack/react-query": "^5.62.7",
    "clsx": "^2.1.1",
    "framer-motion": "^12.0.0",
    "highcharts": "^13.0.0",
    "klinecharts": "^10.0.1",
    "lightweight-charts": "^5.2.0",
    "lucide-react": "^0.475.0",
    "next": "^15.3.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-resizable-panels": "^2.1.7",
    "react-virtuoso": "^4.12.3",
    "tailwind-merge": "^3.0.1",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.0",
    "@types/node": "^22.10.0",
    "@types/react": "19.2.18",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "5.9.3"
  }
}
```
