// Liquid glass as a real refraction shader. Two passes: the backdrop (glowing field + the text and pictures
// that sit behind the glass) goes to a mipmapped texture, then glass shapes bend what is behind them.
// Rules taken from the liquid-glass-motion skill (yordilorenzo/liquid-glass-skills, MIT), translated from SwiftUI:
// glass never fades, it materializes by ramping its lensing (m); bigger glass is thicker glass; shapes that come
// near each other merge (smooth union), so every split and merge is a true morph; never pure black behind glass.
const N = 4;
const VS = `#version 300 es
void main(){ vec2 v[3]=vec2[](vec2(-1,-1),vec2(3,-1),vec2(-1,3)); gl_Position=vec4(v[gl_VertexID],0,1); }`;
const FS_BG = `#version 300 es
precision highp float; out vec4 o;
uniform vec2 uRes; uniform float uBeat,uHeat,uPale,uRib,uRibY,uRibK; uniform vec4 uBl[4]; uniform vec2 uBs[4]; uniform vec4 uRip,uWipe; uniform sampler2D uText;
vec3 ramp(float v,vec3 a,vec3 b,vec3 c,vec3 d,vec3 e){ if(v<.3) return mix(a,b,smoothstep(0.,.3,v)); if(v<.55) return mix(b,c,smoothstep(.3,.55,v)); if(v<.78) return mix(c,d,smoothstep(.55,.78,v)); return mix(d,e,smoothstep(.78,1.,v)); }
void main(){
  vec2 p=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  if(uRip.w>0.){ vec2 q=p-uRip.xy; float r=length(q)+1e-3, w=r-uRip.z; p+=q/r*uRip.w*sin(w*.035)*exp(-w*w/52000.); }
  vec2 s=p/uRes; float asp=uRes.x/uRes.y;
  float x=s.x+.03*sin(s.y*5.2+uBeat*.22), v=0.;
  for(int i=0;i<4;i++){ vec2 d=(vec2(x,s.y)-uBl[i].xy)/uBs[i]; v+=uBl[i].z*exp(-dot(d,d)); }
  float k=smoothstep(0.,1.,uRibK*1.4-s.x*.4);
  for(int i=0;i<9;i++){ float fi=float(i), ly=uRibY+fi*.0085+.028*sin(s.x*3.1+fi*.33+uBeat*.09)-(s.x-.5)*.07; float e=(s.y-ly)/(.0016+.0005*fi); v+=uRib*k*exp(-e*e)*(.62-.045*fi); }
  v=1.-exp(-v*1.3); v=clamp(v*(1.-.22*uHeat),0.,1.);
  vec3 c=ramp(v,vec3(.030,.110,.400),vec3(.040,.260,.840),vec3(.055,.550,.960),vec3(.480,.900,.955),vec3(.960,1.,.985));
  vec3 h=ramp(v,vec3(.250,.035,.075),vec3(.760,.115,.040),vec3(1.,.415,.065),vec3(1.,.720,.350),vec3(1.,.960,.860));
  float hh=uHeat; if(uWipe.w>.5){ float w=smoothstep(uWipe.z-230.,uWipe.z+230.,length(p-uWipe.xy)); hh=uWipe.w<1.5?1.-w:w; }
  vec3 col=mix(c,h,hh);
  col=mix(col,mix(vec3(.800,.905,.945),vec3(.620,.830,.930),v),uPale);
  vec4 t=texture(uText,p/uRes); col=col*(1.-t.a)+t.rgb;
  o=vec4(col,1.);
}`;
const FS_GL = `#version 300 es
precision highp float; out vec4 o;
uniform vec2 uRes; uniform float uK,uFrost,uDim,uSeed,uLens,uBody; uniform vec4 uA[${N}],uB[${N}]; uniform sampler2D uBack;
float sdRR(vec2 p,vec2 b,float r){ vec2 q=abs(p)-b+r; return length(max(q,0.))+min(max(q.x,q.y),0.)-r; }
float sdDrop(vec2 q,float r){ vec2 p=vec2(abs(q.x),-q.y); float r2=r*.05,h=r*1.62,b=(r-r2)/h,a=sqrt(1.-b*b),k=dot(p,vec2(-b,a)); if(k<0.) return length(p)-r; if(k>a*h) return length(p-vec2(0,h))-r2; return dot(p,vec2(a,b))-r; }
float smin(float a,float b,float k){ float h=max(k-abs(a-b),0.)/k; return min(a,b)-h*h*k*.25; }
float one(vec2 p,int i){ vec2 q=p-uA[i].xy; float rr=sdRR(q,uA[i].zw,uB[i].x); return uB[i].y>.001?mix(rr,sdDrop(q,min(uA[i].z,uA[i].w)),uB[i].y):rr; }
float map(vec2 p){ float d=1e5; for(int i=0;i<${N};i++){ if(uB[i].z<=.001) continue; d=smin(d,one(p,i),uK); } return d; }
vec3 back(vec2 p,float lod){ return textureLod(uBack,vec2(p.x,uRes.y-p.y)/uRes,lod).rgb; }
void main(){
  vec2 p=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  vec3 col=back(p,0.);
  float d=map(p);
  float n0=fract(sin(dot(gl_FragCoord.xy+uSeed,vec2(12.9898,78.233)))*43758.5453)-.5;
  if(d<110.){
    // the material at this point, weighted toward the nearest shape: bigger glass is thicker glass
    float W_=0.,m=0.,B=0.,th=0.;
    for(int i=0;i<${N};i++){ if(uB[i].z<=.001) continue; float w=exp(-max(one(p,i),0.)/26.)+1e-4; float side=uB[i].y>.5?uA[i].z:min(uA[i].z,uA[i].w); W_+=w; m+=w*uB[i].z; B+=w*clamp(side*.62,10.,74.); th+=w*smoothstep(26.,230.,side); }
    m/=W_; B/=W_; th/=W_;
    // shadow, deeper under thicker glass
    float ds=map(p-vec2(0.,10.+th*22.));
    col*=1.-m*(.2+th*.2)*smoothstep(70.+th*50.,-8.,ds);
    if(d<1.5){
      vec2 e=vec2(1.4,0.); vec2 g=vec2(map(p+e.xy)-map(p-e.xy),map(p+e.yx)-map(p-e.yx)); float gn=length(g); vec2 nr=gn>1e-5?g/gn:vec2(0.);
      float t=clamp(-d/B,0.,1.), inv=1.-t, off=m*uLens*(inv*inv*B*(1.25+th*1.1));
      float lod=uFrost*m*3.4;
      vec3 c=vec3(back(p-nr*off*.92,lod).r,back(p-nr*off,lod).g,back(p-nr*off*1.08,lod).b);
      c=mix(col,c,clamp(m*3.,0.,1.));
      c*=mix(1.,uDim,m);
      vec2 L=normalize(vec2(-.55,-.83)); float nl=dot(nr,L);
      float sheen=inv*inv*(max(nl,0.)*.42+max(-nl,0.)*.26);
      float rim=exp(-pow((d+1.6)/1.5,2.))*(.22+.78*nl*nl);
      float body=uBody;
      c+=m*(sheen+rim*.95+body);
      float a=smoothstep(.8,-.8,d);
      col=mix(col,c,a);
    }
  }
  o=vec4(col+n0/255.,1.);
}`;
function prog(gl, fsrc) {
  const mk = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) console.error('GLSL', gl.getShaderInfoLog(x)); return x; };
  const P = gl.createProgram(); gl.attachShader(P, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(P, mk(gl.FRAGMENT_SHADER, fsrc)); gl.linkProgram(P);
  if (!gl.getProgramParameter(P, gl.LINK_STATUS)) console.error('LINK', gl.getProgramInfoLog(P));
  const U = {}; const n = gl.getProgramParameter(P, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(P, i).name; U[a.replace('[0]', '')] = gl.getUniformLocation(P, a); }
  return { P, U };
}
export function makeGlass(W, H) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const gl = cv.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: true });
  if (!gl) { console.error('NO WEBGL2'); return null; }
  cv.addEventListener('webglcontextlost', () => console.error('WEBGL CONTEXT LOST'));
  const hi = !!gl.getExtension('EXT_color_buffer_float');
  const bgP = prog(gl, FS_BG), glP = prog(gl, FS_GL), vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const tb = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tb);
  gl.texStorage2D(gl.TEXTURE_2D, 6, hi ? gl.RGBA16F : gl.RGBA8, W, H);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tb, 0);
  const tt = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tt);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.viewport(0, 0, W, H);
  return {
    canvas: cv,
    render({ text, beat, heat, pale, rib, ribY, ribK, blobs, rip, wipe, shapes, k, frost, dim, seed, lens, body }) {
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tt); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, text);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.useProgram(bgP.P); let U = bgP.U;
      gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uBeat, beat); gl.uniform1f(U.uHeat, heat); gl.uniform1f(U.uPale, pale); gl.uniform1f(U.uRib, rib); gl.uniform1f(U.uRibY, ribY); gl.uniform1f(U.uRibK, ribK); gl.uniform1i(U.uText, 1);
      gl.uniform4fv(U.uBl, blobs.flatMap((b) => [b.x, b.y, b.a, 0])); gl.uniform2fv(U.uBs, blobs.flatMap((b) => [b.sx, b.sy])); gl.uniform4fv(U.uRip, rip); gl.uniform4fv(U.uWipe, wipe);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, null);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.bindTexture(gl.TEXTURE_2D, tb); gl.generateMipmap(gl.TEXTURE_2D);
      gl.useProgram(glP.P); U = glP.U; gl.uniform2f(U.uRes, W, H); gl.uniform1f(U.uK, Math.max(.01, k)); gl.uniform1f(U.uFrost, frost); gl.uniform1f(U.uDim, dim); gl.uniform1f(U.uSeed, seed); gl.uniform1f(U.uLens, lens); gl.uniform1f(U.uBody, body); gl.uniform1i(U.uBack, 0);
      gl.uniform4fv(U.uA, shapes.flatMap((s) => [s.x, s.y, Math.max(0, s.hw), Math.max(0, s.hh)]));
      gl.uniform4fv(U.uB, shapes.flatMap((s) => [Math.min(Math.max(0, s.r), Math.max(0, Math.min(s.hw, s.hh))), Math.min(1, Math.max(0, s.drop)), Math.min(1, Math.max(0, s.m)), 0]));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
