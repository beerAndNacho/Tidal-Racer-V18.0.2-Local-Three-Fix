"""Extract the realistic male from Blender Studio's CC0 base-mesh bundle."""

from pathlib import Path
import argparse
import sys

import bpy
from mathutils import Vector


raw = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
parser = argparse.ArgumentParser()
parser.add_argument("--output", required=True)
parser.add_argument("--gender", choices=("male", "female"), default="male")
args = parser.parse_args(raw)

stem = f"GEO-body_{args.gender}_realistic"
keep = {
    stem,
    f"{stem}.eye.L",
    f"{stem}.eye.R",
}
for obj in list(bpy.data.objects):
    if obj.name not in keep:
        bpy.data.objects.remove(obj, do_unlink=True)

body = bpy.data.objects[stem]
eyes = [bpy.data.objects[f"{stem}.eye.L"], bpy.data.objects[f"{stem}.eye.R"]]
for eye in eyes:
    world = eye.matrix_world.copy()
    eye.parent = None
    eye.matrix_world = world

points = [body.matrix_world @ Vector(corner) for corner in body.bound_box]
center_x = (min(p.x for p in points) + max(p.x for p in points)) * 0.5
center_y = (min(p.y for p in points) + max(p.y for p in points)) * 0.5
ground_z = min(p.z for p in points)
offset = Vector((-center_x, -center_y, -ground_z))
for obj in (body, *eyes):
    obj.matrix_world.translation += offset
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.select_set(False)
    obj.hide_render = False
    obj.hide_viewport = False
    obj.hide_set(False)

body["source"] = "Blender Studio Human Base Meshes Bundle v1.0.0"
body["source_url"] = "https://download.blender.org/demo/bundles/bundles-3.6/human-base-meshes-bundle-v1.0.0.zip"
body["license"] = "CC0 1.0 Universal"
body["body_variant"] = args.gender

output = Path(args.output).resolve()
output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(output), compress=True)
print(f"CODEX_EXTRACTED={output}")
