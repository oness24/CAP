var osdCsp = JSON.parse(document.querySelector('osd-csp').getAttribute('data'));
window.__osdStrictCsp__ = osdCsp.strictCsp;
window.__osdThemeTag__ = "v7light";
window.__osdPublicPath__ = {"core":"/47302/bundles/core/","osd-ui-shared-deps":"/47302/bundles/osd-ui-shared-deps/","alertingDashboards":"/47302/bundles/plugin/alertingDashboards/","usageCollection":"/47302/bundles/plugin/usageCollection/","opensearchDashboardsUtils":"/47302/bundles/plugin/opensearchDashboardsUtils/","opensearchDashboardsLegacy":"/47302/bundles/plugin/opensearchDashboardsLegacy/","urlForwarding":"/47302/bundles/plugin/urlForwarding/","devTools":"/47302/bundles/plugin/devTools/","dataSourceManagement":"/47302/bundles/plugin/dataSourceManagement/","opensearchDashboardsReact":"/47302/bundles/plugin/opensearchDashboardsReact/","mapsLegacy":"/47302/bundles/plugin/mapsLegacy/","charts":"/47302/bundles/plugin/charts/","visDefaultEditor":"/47302/bundles/plugin/visDefaultEditor/","data":"/47302/bundles/plugin/data/","inspector":"/47302/bundles/plugin/inspector/","uiActions":"/47302/bundles/plugin/uiActions/","share":"/47302/bundles/plugin/share/","opensearchUiShared":"/47302/bundles/plugin/opensearchUiShared/","embeddable":"/47302/bundles/plugin/embeddable/","savedObjects":"/47302/bundles/plugin/savedObjects/","expressions":"/47302/bundles/plugin/expressions/","home":"/47302/bundles/plugin/home/","console":"/47302/bundles/plugin/console/","apmOss":"/47302/bundles/plugin/apmOss/","management":"/47302/bundles/plugin/management/","indexPatternManagement":"/47302/bundles/plugin/indexPatternManagement/","advancedSettings":"/47302/bundles/plugin/advancedSettings/","navigation":"/47302/bundles/plugin/navigation/","reportsDashboards":"/47302/bundles/plugin/reportsDashboards/","indexManagementDashboards":"/47302/bundles/plugin/indexManagementDashboards/","dashboard":"/47302/bundles/plugin/dashboard/","visualizations":"/47302/bundles/plugin/visualizations/","discover":"/47302/bundles/plugin/discover/","visTypeVega":"/47302/bundles/plugin/visTypeVega/","visTypeTimeline":"/47302/bundles/plugin/visTypeTimeline/","visTypeTable":"/47302/bundles/plugin/visTypeTable/","visTypeMarkdown":"/47302/bundles/plugin/visTypeMarkdown/","visBuilder":"/47302/bundles/plugin/visBuilder/","visTypeVislib":"/47302/bundles/plugin/visTypeVislib/","tileMap":"/47302/bundles/plugin/tileMap/","regionMap":"/47302/bundles/plugin/regionMap/","customImportMapDashboards":"/47302/bundles/plugin/customImportMapDashboards/","inputControlVis":"/47302/bundles/plugin/inputControlVis/","ganttChartDashboards":"/47302/bundles/plugin/ganttChartDashboards/","visualize":"/47302/bundles/plugin/visualize/","notificationsDashboards":"/47302/bundles/plugin/notificationsDashboards/","opensearchDashboardsOverview":"/47302/bundles/plugin/opensearchDashboardsOverview/","visTypeTimeseries":"/47302/bundles/plugin/visTypeTimeseries/","visTypeTagcloud":"/47302/bundles/plugin/visTypeTagcloud/","visTypeMetric":"/47302/bundles/plugin/visTypeMetric/","savedObjectsManagement":"/47302/bundles/plugin/savedObjectsManagement/","securityDashboards":"/47302/bundles/plugin/securityDashboards/","wazuh":"/47302/bundles/plugin/wazuh/","bfetch":"/47302/bundles/plugin/bfetch/"};
window.__osdBundles__ = (function osdBundlesLoader() {
  var modules = {};

  function has(prop) {
    return Object.prototype.hasOwnProperty.call(modules, prop);
  }

  function define(key, bundleRequire, bundleModuleKey) {
    if (has(key)) {
      throw new Error('__osdBundles__ already has a module defined for "' + key + '"');
    }

    modules[key] = {
      bundleRequire,
      bundleModuleKey
    };
  }

  function get(key) {
    if (!has(key)) {
      throw new Error('__osdBundles__ does not have a module defined for "' + key + '"');
    }

    return modules[key].bundleRequire(modules[key].bundleModuleKey);
  }

  return {
    has: has,
    define: define,
    get: get
  };
})();

if (window.__osdStrictCsp__ && window.__osdCspNotEnforced__) {
  var legacyBrowserError = document.getElementById('osd_legacy_browser_error');
  legacyBrowserError.style.display = 'flex';
} else {
  if (!window.__osdCspNotEnforced__ && window.console) {
    window.console.log("^ A single error about an inline script not firing due to content security policy is expected!");
  }
  var loadingMessage = document.getElementById('osd_loading_message');
  loadingMessage.style.display = 'flex';

  window.onload = function () {
//WAZUH 
      var interval = setInterval(() => {  
        var title = document.querySelector("#opensearch-dashboards-body > div > div.app-wrapper.hidden-chrome > div > div.application > div > ul > div.euiText.euiText--medium > div")
        if (!!title) {
          clearInterval(interval);
	        var content = document.querySelector("#opensearch-dashboards-body > div");
          content.classList.add("wz-login")
          
          // Don't force custom logo to have 100% width. It should be handled in the svg properties if needed
          document
          .querySelector('#opensearch-dashboards-body .wz-login figure.euiImage--fullWidth')
	        .classList.remove('euiImage--fullWidth')

        } 
      })  
    //

    function failure() {
      // make subsequent calls to failure() noop
      failure = function () {};

      var err = document.createElement('h1');
      err.style['color'] = 'white';
      err.style['font-family'] = 'monospace';
      err.style['text-align'] = 'center';
      err.style['background'] = '#F44336';
      err.style['padding'] = '25px';
      err.innerText = document.querySelector('[data-error-message]').dataset.errorMessage;

      document.body.innerHTML = err.outerHTML;
    }

    var stylesheetTarget = document.querySelector('head meta[name="add-styles-here"]')
    function loadStyleSheet(url, cb) {
      var dom = document.createElement('link');
      dom.rel = 'stylesheet';
      dom.type = 'text/css';
      dom.href = url;
      dom.addEventListener('error', failure);
      dom.addEventListener('load', cb);
      document.head.insertBefore(dom, stylesheetTarget);
    }

    var scriptsTarget = document.querySelector('head meta[name="add-scripts-here"]')
    function loadScript(url, cb) {
      var dom = document.createElement('script');
      dom.async = false;
      dom.src = url;
      dom.addEventListener('error', failure);
      dom.addEventListener('load', cb);
      document.head.insertBefore(dom, scriptsTarget);
    }

    function load(urls, cb) {
      var pending = urls.length;
      urls.forEach(function (url) {
        var innerCb = function () {
          pending = pending - 1;
          if (pending === 0 && typeof cb === 'function') {
            cb();
          }
        }

        if (typeof url !== 'string') {
          load(url, innerCb);
        } else if (url.slice(-4) === '.css') {
          loadStyleSheet(url, innerCb);
        } else {
          loadScript(url, innerCb);
        }
      });
    }

    load([
        '/47302/bundles/osd-ui-shared-deps/osd-ui-shared-deps.@elastic.js',
        '/47302/bundles/osd-ui-shared-deps/osd-ui-shared-deps.js',
        '/47302/bundles/core/core.entry.js',
        '/47302/bundles/plugin/alertingDashboards/alertingDashboards.plugin.js',
        '/47302/bundles/plugin/usageCollection/usageCollection.plugin.js',
        '/47302/bundles/plugin/opensearchDashboardsUtils/opensearchDashboardsUtils.plugin.js',
        '/47302/bundles/plugin/opensearchDashboardsLegacy/opensearchDashboardsLegacy.plugin.js',
        '/47302/bundles/plugin/urlForwarding/urlForwarding.plugin.js',
        '/47302/bundles/plugin/devTools/devTools.plugin.js',
        '/47302/bundles/plugin/dataSourceManagement/dataSourceManagement.plugin.js',
        '/47302/bundles/plugin/opensearchDashboardsReact/opensearchDashboardsReact.plugin.js',
        '/47302/bundles/plugin/mapsLegacy/mapsLegacy.plugin.js',
        '/47302/bundles/plugin/charts/charts.plugin.js',
        '/47302/bundles/plugin/visDefaultEditor/visDefaultEditor.plugin.js',
        '/47302/bundles/plugin/data/data.plugin.js',
        '/47302/bundles/plugin/inspector/inspector.plugin.js',
        '/47302/bundles/plugin/uiActions/uiActions.plugin.js',
        '/47302/bundles/plugin/share/share.plugin.js',
        '/47302/bundles/plugin/opensearchUiShared/opensearchUiShared.plugin.js',
        '/47302/bundles/plugin/embeddable/embeddable.plugin.js',
        '/47302/bundles/plugin/savedObjects/savedObjects.plugin.js',
        '/47302/bundles/plugin/expressions/expressions.plugin.js',
        '/47302/bundles/plugin/home/home.plugin.js',
        '/47302/bundles/plugin/console/console.plugin.js',
        '/47302/bundles/plugin/apmOss/apmOss.plugin.js',
        '/47302/bundles/plugin/management/management.plugin.js',
        '/47302/bundles/plugin/indexPatternManagement/indexPatternManagement.plugin.js',
        '/47302/bundles/plugin/advancedSettings/advancedSettings.plugin.js',
        '/47302/bundles/plugin/navigation/navigation.plugin.js',
        '/47302/bundles/plugin/reportsDashboards/reportsDashboards.plugin.js',
        '/47302/bundles/plugin/indexManagementDashboards/indexManagementDashboards.plugin.js',
        '/47302/bundles/plugin/dashboard/dashboard.plugin.js',
        '/47302/bundles/plugin/visualizations/visualizations.plugin.js',
        '/47302/bundles/plugin/discover/discover.plugin.js',
        '/47302/bundles/plugin/visTypeVega/visTypeVega.plugin.js',
        '/47302/bundles/plugin/visTypeTimeline/visTypeTimeline.plugin.js',
        '/47302/bundles/plugin/visTypeTable/visTypeTable.plugin.js',
        '/47302/bundles/plugin/visTypeMarkdown/visTypeMarkdown.plugin.js',
        '/47302/bundles/plugin/visBuilder/visBuilder.plugin.js',
        '/47302/bundles/plugin/visTypeVislib/visTypeVislib.plugin.js',
        '/47302/bundles/plugin/tileMap/tileMap.plugin.js',
        '/47302/bundles/plugin/regionMap/regionMap.plugin.js',
        '/47302/bundles/plugin/customImportMapDashboards/customImportMapDashboards.plugin.js',
        '/47302/bundles/plugin/inputControlVis/inputControlVis.plugin.js',
        '/47302/bundles/plugin/ganttChartDashboards/ganttChartDashboards.plugin.js',
        '/47302/bundles/plugin/visualize/visualize.plugin.js',
        '/47302/bundles/plugin/notificationsDashboards/notificationsDashboards.plugin.js',
        '/47302/bundles/plugin/opensearchDashboardsOverview/opensearchDashboardsOverview.plugin.js',
        '/47302/bundles/plugin/visTypeTimeseries/visTypeTimeseries.plugin.js',
        '/47302/bundles/plugin/visTypeTagcloud/visTypeTagcloud.plugin.js',
        '/47302/bundles/plugin/visTypeMetric/visTypeMetric.plugin.js',
        '/47302/bundles/plugin/savedObjectsManagement/savedObjectsManagement.plugin.js',
        '/47302/bundles/plugin/securityDashboards/securityDashboards.plugin.js',
        '/47302/bundles/plugin/wazuh/wazuh.plugin.js',
        '/47302/bundles/plugin/bfetch/bfetch.plugin.js',
    ], function () {
      __osdBundles__.get('entry/core/public').__osdBootstrap__();

      load([
          '/47302/bundles/osd-ui-shared-deps/osd-ui-shared-deps.css',
          '/47302/bundles/osd-ui-shared-deps/osd-ui-shared-deps.v7.light.css',
          '/node_modules/@osd/ui-framework/dist/kui_light.css',
          '/ui/legacy_light_theme.css',
      ]);
    });
  }
}
