#version 110

/* scaled params */
uniform vec2 frame_size;
uniform vec4 rect_coords; //x1 [0], x2 [1], y1 [2], y2 [3]; coords of the rect_frame
uniform float stroke_width_half;
uniform vec2 rect_size_half;
uniform vec4 radius;
uniform float edge_softness;
/* colors params*/
uniform vec4 fill_color;
uniform vec4 stroke_color;

float calc_distance(vec2 p, vec2 b, vec4 r)
{
    r.xy = (p.x > 0.0) ? r.xy : r.zw;
    r.x  = (p.y > 0.0) ? r.x  : r.y;

    vec2 d = abs(p) - b + r.x;
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r.x;
}

float corner(float x, float a) {
    float d = abs(x);
    if (d < a) {
        // inside the smoothing region, use a circular
        return 2.0 * a - sqrt(2.0 * a * a - x * x);
    } else {
        // outside the region, it's just the standard absolute value
        return d;
    }
}

float distance_corner(float d1, float d2, float k) {
    return 0.5 * (d1 + d2 - corner(d1 - d2, k));
}

float calc_distance_max_radius(vec2 p, vec2 b, vec4 r) {
    float right = b.x - p.x;
    float left  = b.x + p.x;
    float top   = b.y - p.y;
    float bottom= b.y + p.y;
    
    float tr = distance_corner(right, top,    r.x); // top-right
    float br = distance_corner(right, bottom, r.y); // bottom-right
    float bl = distance_corner(left,  bottom, r.w); // bottom-left
    float tl = distance_corner(left,  top,    r.z); // top-left
    
    // minimum distance to any corner (negative inside, positive outside)
    return -min(min(tr, br), min(bl, tl));
}

void main()
{
    vec4 frag_rect_coords = vec4(rect_coords[0], rect_coords[1], frame_size.y - rect_coords[3], frame_size.y - rect_coords[2]);
    vec2 vec_centered_pos = (gl_FragCoord.xy - vec2(frag_rect_coords[0] + frag_rect_coords[1], frag_rect_coords[2] + frag_rect_coords[3]) * 0.5);

    float distance;
    float max_radius = max(max(radius.x, radius.y), max(radius.z, radius.w));

    if (max_radius > min(rect_size_half.x, rect_size_half.y)+stroke_width_half)
    {
        //TODO radius must be scaled (decreased) proportionally if stroke_width_half > 0
        distance = calc_distance_max_radius(vec_centered_pos, rect_size_half, radius);
    } 
    else 
    {
        distance = calc_distance(vec_centered_pos, rect_size_half, radius - stroke_width_half);
    }

    vec4 final_color;
    float final_alpha;

    if (stroke_width_half > 0.0)
    {
        float color_blend = smoothstep(-stroke_width_half - edge_softness, -stroke_width_half + edge_softness, distance);
        final_color = mix(fill_color, stroke_color, color_blend);
        final_alpha = 1.0 - smoothstep(stroke_width_half - edge_softness, stroke_width_half + edge_softness, distance);
    }
    else
    {
        final_color = fill_color;
        final_alpha = 1.0 - smoothstep(-edge_softness, edge_softness, distance);
    }

    // final color
    gl_FragColor = vec4(final_color.rgb, final_color.a * final_alpha);
}