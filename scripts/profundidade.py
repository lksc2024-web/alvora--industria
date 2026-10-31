# Gera os mapas de profundidade de public/foto/*-prof.jpg. Rodar na raiz: python3 scripts/profundidade.py
from PIL import Image
import numpy as np, cv2
nomes=['01-fruto-na-planta','02-o-fruto','03-colheita','04-secagem','05-grao-cru','06-torra','07-tambor','08-moagem','09-preparo','10-cafe-caindo','11-xicara']
PRIOR={'04-secagem':0.75,'07-tambor':0.6,'10-cafe-caindo':0.5,'11-xicara':0.5,'09-preparo':0.5}
for nome in nomes:
  im=Image.open(f'public/foto/{nome}.jpg')
  g=cv2.cvtColor(np.asarray(im),cv2.COLOR_RGB2GRAY).astype(np.float32)/255
  lap=cv2.Laplacian(cv2.GaussianBlur(g,(3,3),0),cv2.CV_32F)
  s=np.sqrt(cv2.GaussianBlur(lap*lap,(0,0),8));s=np.clip(s/np.percentile(s,97),0,1)
  b=(s>0.3).astype(np.uint8)*255
  b=cv2.morphologyEx(b,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(61,61)))
  cs,_=cv2.findContours(b,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
  f=np.zeros_like(b)
  h,w=g.shape
  EL={'02-o-fruto':[(.5,.52,.39,.225,0)],'05-grao-cru':[(.52,.30,.17,.115,-15),(.5,.95,.7,.3,0)],'06-torra':[(.52,.40,.19,.15,-75)],
      '08-moagem':[(.5,.38,.22,.13,-60),(.5,.42,.4,.25,-60)],'10-cafe-caindo':[(.5,.47,.45,.13,0),(.52,.2,.05,.25,0)],'11-xicara':[(.46,.52,.46,.18,0)],
      '09-preparo':[(.45,.33,.45,.12,0),(.45,.2,.04,.2,0)]}
  if nome in EL:
    for (cx,cy,rx,ry,ang) in EL[nome]:
      cv2.ellipse(f,(int(cx*w),int(cy*h)),(int(rx*w),int(ry*h)),ang,0,360,255,-1)
  else:
    for c in cs:
      if cv2.contourArea(c)>3000: cv2.drawContours(f,[c],-1,255,-1)
  f=f.astype(np.float32)/255
  h,w=g.shape;yy=np.linspace(0,1,h)[:,None]*np.ones((1,w))
  pr=PRIOR.get(nome,0.35)
  d=(1-pr)*(0.75*f+0.25*s)+pr*yy
  d=cv2.GaussianBlur(d,(0,0),20);d=(d-d.min())/(d.max()-d.min()+1e-6)
  Image.fromarray((d*255).astype(np.uint8)).resize((235,418),Image.LANCZOS).save(f'public/foto/{nome}-prof.jpg',quality=88)



