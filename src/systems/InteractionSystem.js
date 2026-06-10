const PROXIMITY_RADIUS = 48;

export default class InteractionSystem {
  constructor(scene) {
    this.scene    = scene;
    this.entities = [];
    this._near    = null; // currently in-range entity
  }

  loadFromMap(map) {
    const layer = map.getObjectLayer('Entities');
    if (!layer) {
      console.warn('[InteractionSystem] No Entities layer found in map');
      return;
    }
    this.entities = layer.objects.map(obj => ({
      id:   obj.id,
      name: obj.name,
      type: obj.type,
      x:    obj.x + (obj.width  ?? 32) / 2,
      y:    obj.y + (obj.height ?? 32) / 2,
      properties: Object.fromEntries(
        (obj.properties ?? []).map(p => [p.name, p.value])
      ),
    }));
    console.log(`[InteractionSystem] Loaded ${this.entities.length} entities`);
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
