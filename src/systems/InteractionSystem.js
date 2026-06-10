const PROXIMITY_RADIUS = 48;

export default class InteractionSystem {
  constructor(scene) {
    this.scene    = scene;
    this.entities = [];
    this._near    = null;
  }

  // Primary path: load from a plain JS array (entities.json or Home JSON)
  setEntities(list) {
    this.entities = list.map(e => ({ ...e }));
    console.log(`[InteractionSystem] Loaded ${this.entities.length} entities`);
  }

  // Fallback: parse from a Tiled object layer
  loadFromMap(map) {
    const layer = map.getObjectLayer('Entities');
    if (!layer) {
      console.warn('[InteractionSystem] No Entities layer found in map');
      return;
    }
    this.setEntities(
      layer.objects.map(obj => ({
        id:   String(obj.id),
        name: obj.name,
        type: obj.type,
        x:    obj.x + (obj.width  ?? 32) / 2,
        y:    obj.y + (obj.height ?? 32) / 2,
        ...Object.fromEntries((obj.properties ?? []).map(p => [p.name, p.value])),
      }))
    );
  }

  update(px, py) {
    let nearest     = null;
    let nearestDist = Infinity;

    for (const entity of this.entities) {
      const dx   = px - entity.x;
      const dy   = py - entity.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < PROXIMITY_RADIUS && dist < nearestDist) {
        nearest     = entity;
        nearestDist = dist;
      }
    }

    if (nearest !== this._near) {
      if (this._near) this.scene.events.emit('proximityLeave',  this._near);
      if (nearest)    this.scene.events.emit('proximityEnter',  nearest);
      this._near = nearest;
    }

    return this._near;
  }
}
