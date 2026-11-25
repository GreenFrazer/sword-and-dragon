#!/bin/sh
# Assemble src/ parts into the single-file game (index.html)
cd "$(dirname "$0")/src" && cat p0_head.html p1_core.js p2_logic.js p2b_village.js p3_sim.js p4_render.js p5_gear.js p6_fx.js p8a_titlebg.js p8b_menu.js p7_start.js > ../index.html && printf '</script>\n</body>\n</html>\n' >> ../index.html && echo "built index.html"
