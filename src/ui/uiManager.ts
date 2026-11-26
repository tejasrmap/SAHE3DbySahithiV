import buildingsData from '../data/buildings.json';
import poisData from '../data/pois.json';
import { UserPreferences } from '../storage/userPreferences';
import { CameraManager } from '../camera/cameraManager';
import { PedestrianRouter } from '../navigation/pedestrianRouter';
import { TourController, TourStop } from '../tours/tourController';
import { FirstPersonController } from '../camera/firstPersonController';
import { LightingSystem, TimePreset } from '../scene/lightingSystem';
import { EnvironmentEngine, WeatherType, SeasonType } from '../scene/environment';

export class UIManager {
  private userPrefs: UserPreferences;
  private cameraMgr: CameraManager;
  private router: PedestrianRouter;
  private tourCtrl: TourController;
  private fpCtrl: FirstPersonController;
  private lighting: LightingSystem;
  private env: EnvironmentEngine;

  private selectedPlace: any = null;
  private activeCategory: string | null = null;
  private allPlaces: any[] = [];

  constructor(
    cameraMgr: CameraManager,
    router: PedestrianRouter,
    tourCtrl: TourController,
    fpCtrl: FirstPersonController,
    lighting: LightingSystem,
    env: EnvironmentEngine
  ) {
    this.userPrefs = UserPreferences.getInstance();
    this.cameraMgr = cameraMgr;
    this.router = router;
    this.tourCtrl = tourCtrl;
    this.fpCtrl = fpCtrl;
    this.lighting = lighting;
    this.env = env;

    this.allPlaces = [...buildingsData, ...poisData];

    this.bindSearch();
    this.bindFilterChips();
    this.bindSidebar();
    this.bindToolbar();
    this.bindTourHUD();
    this.bindTimeWeatherModal();
  }

  private bindSearch(): void {
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const searchResults = document.getElementById('search-results') as HTMLDivElement;

    if (!searchInput || !searchResults) return;

    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim().toLowerCase();
      searchResults.replaceChildren();

      if (!query) {
        searchResults.style.display = 'none';
        return;
      }

      const matches = this.allPlaces.filter(p => {
        const nameMatch = (p.name || '').toLowerCase().includes(query);
        const catMatch = (p.category || '').toLowerCase().includes(query);
        const descMatch = (p.description || '').toLowerCase().includes(query);
        const facilityMatch = (p.facilities || []).some((f: string) => f.toLowerCase().includes(query));
        return nameMatch || catMatch || descMatch || facilityMatch;
      });

      if (matches.length === 0) {
        const noMatch = document.createElement('div');
        noMatch.className = 'search-result-item';
        noMatch.textContent = 'No matching campus locations found. Try "library", "hostel", or "canteen".';
        searchResults.appendChild(noMatch);
      } else {
        matches.slice(0, 8).forEach(place => {
          const item = document.createElement('div');
          item.className = 'search-result-item';

          const nameSpan = document.createElement('span');
          nameSpan.textContent = this.userPrefs.getCustomName(place.id, place.name);

          const catSpan = document.createElement('span');
          catSpan.className = 'search-category-tag';
          catSpan.textContent = place.category.toUpperCase();

          item.appendChild(nameSpan);
          item.appendChild(catSpan);

          item.addEventListener('click', () => {
            this.selectPlace(place);
            searchResults.style.display = 'none';
            searchInput.value = '';
          });

          searchResults.appendChild(item);
        });
      }

      searchResults.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
      if (!document.getElementById('search-container')?.contains(e.target as Node)) {
        searchResults.style.display = 'none';
      }
    });
  }

  private bindFilterChips(): void {
    const chipsContainer = document.getElementById('filter-chips');
    if (!chipsContainer) return;

    const categories = [
      { id: null, label: 'All Places' },
      { id: 'academic', label: 'Academic' },
      { id: 'library', label: 'Library' },
      { id: 'hostels', label: 'Hostels' },
      { id: 'food', label: 'Dining' },
      { id: 'sports', label: 'Sports' },
      { id: 'services', label: 'Services' },
      { id: 'landmark', label: 'Landmarks' }
    ];

    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `chip-btn ${cat.id === null ? 'active' : ''}`;
      btn.textContent = cat.label;

      btn.addEventListener('click', () => {
        chipsContainer.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeCategory = cat.id;
        this.renderSidebarList();
      });

      chipsContainer.appendChild(btn);
    });
  }

  private bindSidebar(): void {
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebar = document.getElementById('campus-sidebar');

    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        const isOpen = sidebar.style.display === 'flex';
        sidebar.style.display = isOpen ? 'none' : 'flex';
        if (!isOpen) this.renderSidebarList();
      });
    }
  }

  private renderSidebarList(): void {
    const container = document.getElementById('sidebar-items');
    if (!container) return;

    container.replaceChildren();

    const filtered = this.activeCategory
      ? this.allPlaces.filter(p => p.category === this.activeCategory)
      : this.allPlaces;

    filtered.forEach(place => {
      const item = document.createElement('div');
      item.className = 'directory-item';

      const title = document.createElement('span');
      title.textContent = this.userPrefs.getCustomName(place.id, place.name);

      const favIcon = document.createElement('span');
      favIcon.textContent = this.userPrefs.isFavorite(place.id) ? '★' : '☆';
      favIcon.style.cursor = 'pointer';
      favIcon.style.color = this.userPrefs.isFavorite(place.id) ? '#f59e0b' : '#94a3b8';

      favIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        const isFav = this.userPrefs.toggleFavorite(place.id);
        favIcon.textContent = isFav ? '★' : '☆';
        favIcon.style.color = isFav ? '#f59e0b' : '#94a3b8';
      });

      item.appendChild(title);
      item.appendChild(favIcon);

      item.addEventListener('click', () => {
        this.selectPlace(place);
      });

      container.appendChild(item);
    });
  }

  public selectPlace(place: any): void {
    this.selectedPlace = place;

    // Camera fly-to
    if (place.scenePosition) {
      const [px, , pz] = place.scenePosition;
      this.cameraMgr.flyTo(
        { x: px, y: 0, z: pz } as any,
        { x: px + 18, y: 32, z: pz + 42 } as any
      );
    }

    this.renderBuildingPanel(place);
  }

  private renderBuildingPanel(place: any): void {
    const panel = document.getElementById('building-panel');
    if (!panel) return;

    panel.replaceChildren();

    // Header with title & accuracy badge
    const header = document.createElement('div');
    header.className = 'building-header';

    const title = document.createElement('div');
    title.className = 'building-title';
    title.textContent = this.userPrefs.getCustomName(place.id, place.name);

    const badge = document.createElement('span');
    badge.className = 'accuracy-badge';
    badge.textContent = place.accuracy || 'VERIFIED';

    header.appendChild(title);
    header.appendChild(badge);
    panel.appendChild(header);

    // Description
    if (place.description) {
      const desc = document.createElement('p');
      desc.style.fontSize = '12.5px';
      desc.style.color = 'var(--text-muted)';
      desc.textContent = place.description;
      panel.appendChild(desc);
    }

    // Stats grid
    const stats = document.createElement('div');
    stats.className = 'building-stats';

    const coordBox = document.createElement('div');
    coordBox.textContent = 'Coordinates';
    const coordVal = document.createElement('span');
    coordVal.textContent = `${place.lat.toFixed(4)}° N, ${place.lon.toFixed(4)}° E`;
    coordBox.appendChild(coordVal);
    stats.appendChild(coordBox);

    if (place.floors) {
      const floorBox = document.createElement('div');
      floorBox.textContent = 'Storeys / Floors';
      const floorVal = document.createElement('span');
      floorVal.textContent = `${place.floors} Floors (${place.height}m)`;
      floorBox.appendChild(floorVal);
      stats.appendChild(floorBox);
    }

    panel.appendChild(stats);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'building-actions';

    const navBtn = document.createElement('button');
    navBtn.className = 'btn-primary';
    navBtn.textContent = '🧭 Navigate Route';
    navBtn.addEventListener('click', () => {
      this.startNavigationTo(place);
    });
    actions.appendChild(navBtn);

    const renameBtn = document.createElement('button');
    renameBtn.className = 'btn-secondary';
    renameBtn.textContent = '✏️ Rename';
    renameBtn.addEventListener('click', () => {
      this.showRenameDialog(place);
    });
    actions.appendChild(renameBtn);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-secondary';
    closeBtn.textContent = '✕ Close';
    closeBtn.addEventListener('click', () => {
      panel.style.display = 'none';
      this.selectedPlace = null;
    });
    actions.appendChild(closeBtn);

    panel.appendChild(actions);
    panel.style.display = 'flex';
  }

  private startNavigationTo(place: any): void {
    // Navigate from Main Gate to this place
    const startNodeId = 'n-main-gate';
    let destNodeId = 'n-central-promenade';

    if (place.id.includes('cse')) destNodeId = 'n-cse-entrance';
    else if (place.id.includes('sh-block-1')) destNodeId = 'n-sh1-entrance';
    else if (place.id.includes('library')) destNodeId = 'n-library-junction';
    else if (place.id.includes('civil')) destNodeId = 'n-civil-entrance';
    else if (place.id.includes('mech')) destNodeId = 'n-mech-entrance';
    else if (place.id.includes('hostel')) destNodeId = 'n-hostel-entrance';
    else if (place.id.includes('canteen')) destNodeId = 'n-canteen-junction';
    else if (place.id.includes('saraswathi')) destNodeId = 'n-saraswathi-circle';

    const result = this.router.findRoute(startNodeId, destNodeId);
    if (result) {
      this.router.renderRoute(result.points);
      alert(`Pedestrian Route Calculated!\n\nDistance: ${result.totalDistanceMeters} meters\nWalking Time: ~${result.estimatedTimeMinutes} minutes\n\nFollow the cyan neon path.`);
    }
  }

  private showRenameDialog(place: any): void {
    const currentName = this.userPrefs.getCustomName(place.id, place.name);
    const newName = prompt('Enter custom place label (or leave blank to restore original):', currentName);
    if (newName !== null) {
      if (newName.trim() === '') {
        this.userPrefs.restoreDefaultName(place.id);
      } else {
        this.userPrefs.setCustomName(place.id, newName);
      }
      this.renderBuildingPanel(place);
      this.renderSidebarList();
    }
  }

  private bindToolbar(): void {
    // 1. 2D / 3D Toggle
    let is2D = false;
    const btn2D = document.getElementById('tool-2d-btn');
    if (btn2D) {
      btn2D.addEventListener('click', () => {
        is2D = !is2D;
        btn2D.textContent = is2D ? '🗺️ 3D View' : '🗺️ 2D Map';
        this.cameraMgr.applyPreset(is2D ? 'aerial' : 'overview');
      });
    }

    // 2. First-Person Walk Mode Toggle
    const btnWalk = document.getElementById('tool-walk-btn');
    const fpHud = document.getElementById('first-person-hud');
    if (btnWalk) {
      btnWalk.addEventListener('click', () => {
        if (!this.fpCtrl.isActive) {
          this.fpCtrl.enter(-31.4, 45.0);
          btnWalk.classList.add('active');
          if (fpHud) fpHud.style.display = 'block';
        } else {
          this.fpCtrl.exit();
          btnWalk.classList.remove('active');
          if (fpHud) fpHud.style.display = 'none';
          this.cameraMgr.applyPreset('overview');
        }
      });
    }

    // 3. Guided Tour Toggle
    const btnTour = document.getElementById('tool-tour-btn');
    if (btnTour) {
      btnTour.addEventListener('click', () => {
        this.tourCtrl.start();
      });
    }

    // 4. Time & Weather Modal Toggle
    const btnWeather = document.getElementById('tool-weather-btn');
    const modal = document.getElementById('weather-modal');
    if (btnWeather && modal) {
      btnWeather.addEventListener('click', () => {
        modal.style.display = 'flex';
      });
    }

    // 5. Reset Camera View
    const btnReset = document.getElementById('tool-reset-btn');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (this.fpCtrl.isActive) this.fpCtrl.exit();
        this.router.clearRoute();
        this.cameraMgr.applyPreset('overview');
      });
    }

    // 6. Traffic Toggle
    const btnTraffic = document.getElementById('tool-traffic-btn');
    if (btnTraffic) {
      btnTraffic.addEventListener('click', () => {
        this.env.trafficGroup.visible = !this.env.trafficGroup.visible;
        this.env.birdsGroup.visible = this.env.trafficGroup.visible;
        btnTraffic.classList.toggle('active', this.env.trafficGroup.visible);
      });
    }
  }

  private bindTourHUD(): void {
    const tourHud = document.getElementById('tour-hud');
    if (!tourHud) return;

    this.tourCtrl.onStopChange = (stop: TourStop, index: number, total: number) => {
      tourHud.style.display = 'flex';
      const counter = tourHud.querySelector('.stop-counter');
      const title = tourHud.querySelector('h2');
      const desc = tourHud.querySelector('p');

      if (counter) counter.textContent = `CAMPUS TOUR • STOP ${index} OF ${total}`;
      if (title) title.textContent = stop.name;
      if (desc) desc.textContent = stop.subtitle;
    };

    this.tourCtrl.onTourEnd = () => {
      tourHud.style.display = 'none';
      this.cameraMgr.applyPreset('overview');
    };

    document.getElementById('tour-prev-btn')?.addEventListener('click', () => this.tourCtrl.prev());
    document.getElementById('tour-next-btn')?.addEventListener('click', () => this.tourCtrl.next());
    document.getElementById('tour-exit-btn')?.addEventListener('click', () => this.tourCtrl.stop());
  }

  private bindTimeWeatherModal(): void {
    const modal = document.getElementById('weather-modal');
    const closeBtn = document.getElementById('close-weather-modal');
    if (modal && closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }

    // Time slider
    const timeSlider = document.getElementById('time-slider') as HTMLInputElement;
    const timeDisplay = document.getElementById('time-display');

    if (timeSlider) {
      timeSlider.addEventListener('input', () => {
        const h = parseFloat(timeSlider.value);
        this.lighting.setTime(h);
        if (timeDisplay) {
          const hours = Math.floor(h);
          const mins = Math.round((h - hours) * 60);
          timeDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        }
      });
    }

    // Time Presets
    const presets: Record<string, number> = {
      'btn-sunrise': 6.0,
      'btn-morning': 9.5,
      'btn-noon': 12.0,
      'btn-golden': 17.0,
      'btn-sunset': 18.2,
      'btn-night': 21.5
    };

    Object.entries(presets).forEach(([id, hour]) => {
      document.getElementById(id)?.addEventListener('click', () => {
        this.lighting.setTime(hour);
        if (timeSlider) timeSlider.value = String(hour);
        if (timeDisplay) {
          const hours = Math.floor(hour);
          const mins = Math.round((hour - hours) * 60);
          timeDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        }
      });
    });

    // Weather buttons
    ['clear', 'cloudy', 'fog', 'rain'].forEach(w => {
      document.getElementById(`wx-${w}`)?.addEventListener('click', () => {
        this.env.applyWeather(w as WeatherType);
      });
    });

    // Season buttons
    ['summer', 'monsoon', 'autumn', 'winter'].forEach(s => {
      document.getElementById(`sn-${s}`)?.addEventListener('click', () => {
        this.env.applySeason(s as SeasonType);
      });
    });
  }
}
