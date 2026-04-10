import React, { useState, useRef, useEffect } from 'react';

const MarginMaster = () => {
  const canvasRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 420 });
  const [points, setPoints] = useState([]);
  const [userLineX, setUserLineX] = useState(null);
  const [userCircle, setUserCircle] = useState(null);
  const [svmData, setSvmData] = useState(null);
  const [phase, setPhase] = useState('learn');
  const [difficulty, setDifficulty] = useState('medium');
  const [svmType, setSvmType] = useState('linear');
  const [userMargin, setUserMargin] = useState(null);
  const [svmMargin, setSvmMargin] = useState(null);
  const [scorePct, setScorePct] = useState(null);
  const [resultMsg, setResultMsg] = useState('');
  const [statusText, setStatusText] = useState('👆 Click "Start Playing" — then draw a line');
  const [phaseTag, setPhaseTag] = useState('LEARN MODE');
  const [comparisonMsg, setComparisonMsg] = useState('');
  const [userValid, setUserValid] = useState(false);
  const [showSolutionBtn, setShowSolutionBtn] = useState(false);

  const [isDrawingCircle, setIsDrawingCircle] = useState(false);
  const [tempCircle, setTempCircle] = useState(null);

  const W = dimensions.width;
  const H = dimensions.height;

  // Detect if mobile screen (width < 640)
  const isMobile = dimensions.width < 640;

  // ----- DATA GENERATION (unchanged) -----
  const generatePoints = () => {
    const pts = [];
    if (svmType === 'linear') {
      const sep = difficulty === 'easy' ? 110 : difficulty === 'medium' ? 70 : 35;
      const noise = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 45 : 55;
      const cx = W / 2, cy = H / 2;
      for (let i = 0; i < 14; i++) {
        let x = cx - sep + (Math.random() - 0.5) * noise;
        let y = cy + (Math.random() - 0.5) * (H * 0.7);
        x = Math.max(40, Math.min(W - 40, x));
        y = Math.max(30, Math.min(H - 30, y));
        pts.push({ x, y, cls: -1 });
      }
      for (let i = 0; i < 14; i++) {
        let x = cx + sep + (Math.random() - 0.5) * noise;
        let y = cy + (Math.random() - 0.5) * (H * 0.7);
        x = Math.max(40, Math.min(W - 40, x));
        y = Math.max(30, Math.min(H - 30, y));
        pts.push({ x, y, cls: 1 });
      }
    } else {
      const cx = W / 2, cy = H / 2;
      const radius = difficulty === 'easy' ? 120 : difficulty === 'medium' ? 90 : 60;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const r = radius * 0.6 + (Math.random() - 0.5) * 25;
        pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, cls: -1 });
      }
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const r = radius * 1.3 + (Math.random() - 0.5) * 30;
        pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, cls: 1 });
      }
    }
    setPoints(pts);
    return pts;
  };

  // ----- COMPUTE SVM (unchanged) -----
  const computeSVM = (pts) => {
    if (svmType === 'linear') {
      const neg = pts.filter(p => p.cls === -1);
      const pos = pts.filter(p => p.cls === 1);
      if (neg.length === 0 || pos.length === 0) return null;
      const rNeg = neg.reduce((a, b) => b.x > a.x ? b : a, neg[0]);
      const lPos = pos.reduce((a, b) => b.x < a.x ? b : a, pos[0]);
      const x = (rNeg.x + lPos.x) / 2;
      const margin = (lPos.x - rNeg.x) / 2;
      const data = { x, margin, sv: [rNeg, lPos], type: 'linear' };
      setSvmData(data);
      setSvmMargin(Math.round(margin));
      return data;
    } else {
      const cx = W / 2, cy = H / 2;
      const neg = pts.filter(p => p.cls === -1);
      const pos = pts.filter(p => p.cls === 1);
      if (neg.length === 0 || pos.length === 0) return null;
      const maxR = Math.max(...neg.map(p => Math.hypot(p.x - cx, p.y - cy)));
      const minR = Math.min(...pos.map(p => Math.hypot(p.x - cx, p.y - cy)));
      const radius = (maxR + minR) / 2;
      const margin = (minR - maxR) / 2;
      const svNeg = neg.reduce((a, b) => Math.abs(Math.hypot(b.x - cx, b.y - cy) - maxR) < 5 ? b : a, neg[0]);
      const svPos = pos.reduce((a, b) => Math.abs(Math.hypot(b.x - cx, b.y - cy) - minR) < 5 ? b : a, pos[0]);
      const data = { x: cx, y: cy, radius, margin, sv: [svNeg, svPos], type: 'rbf' };
      setSvmData(data);
      setSvmMargin(Math.round(margin));
      return data;
    }
  };

  // ----- EVALUATE USER (unchanged) -----
  const evaluateUser = (lineX, circle) => {
    let currentSvm = svmData;
    if (!currentSvm) currentSvm = computeSVM(points);

    if (svmType === 'linear' && lineX !== null) {
      let minDist = Infinity, valid = true;
      points.forEach(p => {
        const d = Math.abs(p.x - lineX);
        const ok = (p.cls === -1 && p.x < lineX) || (p.cls === 1 && p.x > lineX);
        if (!ok) valid = false;
        else minDist = Math.min(minDist, d);
      });
      setUserValid(valid);
      const margin = valid ? Math.round(minDist) : 0;
      setUserMargin(margin);
      const svmM = currentSvm?.margin || 0;
      const pct = svmM > 0 ? Math.min(100, Math.round((margin / svmM) * 100)) : 0;
      setScorePct(pct);
      setResultMsg(!valid ? '⚠️ Line misclassifies points!' : pct >= 90 ? '🏆 Excellent!' : pct >= 65 ? '👍 Good try!' : '📉 Narrow margin.');
      setStatusText('✅ Line drawn! Click "Show SVM Solution"');
    } else if (svmType === 'rbf' && circle) {
      const { cx, cy, r } = circle;
      let minDist = Infinity, valid = true, wrong = 0;
      points.forEach(p => {
        const d = Math.hypot(p.x - cx, p.y - cy);
        const ok = (p.cls === -1 && d < r) || (p.cls === 1 && d > r);
        if (!ok) { valid = false; wrong++; }
        else minDist = Math.min(minDist, Math.abs(d - r));
      });
      setUserValid(valid);
      const margin = valid ? Math.round(minDist) : 0;
      setUserMargin(margin);
      const svmM = currentSvm?.margin || 0;
      const pct = svmM > 0 ? Math.min(100, Math.round((margin / svmM) * 100)) : 0;
      setScorePct(pct);
      setResultMsg(!valid ? `⚠️ Circle misclassifies ${wrong} pts!` : pct >= 90 ? '🏆 Excellent circle!' : pct >= 65 ? '👍 Good circle!' : '📉 Narrow margin.');
      setStatusText('✅ Circle drawn! Click "Show Kernel SVM"');
    }
    setPhase('done');
    setPhaseTag('YOUR TURN DONE');
    setShowSolutionBtn(true);
  };

  // ----- DRAW CANVAS (unchanged) -----
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || W === 0) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f1018';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    if (svmData && phase === 'svm') {
      if (svmData.type === 'linear') {
        ctx.fillStyle = 'rgba(34,197,94,0.07)';
        ctx.fillRect(svmData.x - svmData.margin, 0, svmData.margin * 2, H);
        ctx.setLineDash([7, 5]);
        ctx.strokeStyle = 'rgba(34,197,94,0.5)';
        ctx.lineWidth = 1.5;
        [svmData.x - svmData.margin, svmData.x + svmData.margin].forEach(lx => {
          ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, H); ctx.stroke();
        });
        ctx.setLineDash([]);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(svmData.x, 0); ctx.lineTo(svmData.x, H); ctx.stroke();
        svmData.sv.forEach(sv => {
          ctx.beginPath(); ctx.arc(sv.x, sv.y, 18, 0, Math.PI * 2);
          ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2.5; ctx.stroke();
          ctx.font = 'bold 10px Space Mono'; ctx.fillStyle = '#22c55e';
          ctx.fillText('SV', sv.x + 22, sv.y + 4);
        });
      } else {
        const { x: cx, y: cy, radius: r, margin: m } = svmData;
        ctx.fillStyle = 'rgba(34,197,94,0.07)';
        ctx.beginPath(); ctx.arc(cx, cy, r + m, 0, Math.PI * 2);
        ctx.arc(cx, cy, r - m, 0, Math.PI * 2, true); ctx.fill();
        ctx.setLineDash([7, 5]);
        ctx.strokeStyle = 'rgba(34,197,94,0.6)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, r - m, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r + m, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        svmData.sv.forEach(sv => {
          ctx.beginPath(); ctx.arc(sv.x, sv.y, 18, 0, Math.PI * 2);
          ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2.5; ctx.stroke();
          ctx.font = 'bold 10px Space Mono'; ctx.fillStyle = '#22c55e';
          ctx.fillText('SV', sv.x + 22, sv.y + 4);
        });
        ctx.font = 'bold 13px Barlow Condensed'; ctx.fillStyle = '#22c55e';
        ctx.fillText('RBF KERNEL BOUNDARY', cx - 80, cy - r - 10);
        ctx.fillStyle = '#4da6ff'; ctx.fillText('◀ OUTER CLASS A (+1)', cx + r + 15, cy - 5);
        ctx.fillStyle = '#ff4060'; ctx.fillText('INNER CLASS B (–1) ▶', cx - r - 130, cy + 5);
      }
    }

    if (svmType === 'linear' && userLineX !== null) {
      ctx.strokeStyle = userValid ? '#ffd166' : '#ff4060';
      ctx.lineWidth = 2.5; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(userLineX, 0); ctx.lineTo(userLineX, H); ctx.stroke();
      ctx.font = 'bold 12px Barlow Condensed'; ctx.fillStyle = userValid ? '#ffd166' : '#ff4060';
      ctx.fillText(userValid ? 'YOUR LINE' : 'YOUR LINE (WRONG)', userLineX + 6, H - 16);
    }

    if (svmType === 'rbf') {
      const c = tempCircle || userCircle;
      if (c) {
        const { cx, cy, r } = c;
        const isFinal = !!userCircle;
        ctx.strokeStyle = isFinal ? (userValid ? '#ffd166' : '#ff4060') : '#fbbf24';
        ctx.lineWidth = 2.5; ctx.setLineDash(isFinal ? [] : [8, 4]);
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        if (!isFinal) { ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fillStyle = '#fbbf24'; ctx.fill(); }
        ctx.font = 'bold 12px Barlow Condensed'; ctx.fillStyle = isFinal ? (userValid ? '#ffd166' : '#ff4060') : '#fbbf24';
        ctx.fillText(isFinal ? (userValid ? 'YOUR CIRCLE' : 'YOUR CIRCLE (WRONG)') : 'DRAWING...', cx + r + 10, cy);
      }
    }

    points.forEach(p => {
      const col = p.cls === 1 ? '#4da6ff' : '#ff4060';
      ctx.beginPath(); ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = p.cls === 1 ? 'rgba(77,166,255,0.3)' : 'rgba(255,64,96,0.3)'; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    });

    ctx.font = 'bold 13px Barlow Condensed'; ctx.fillStyle = '#4da6ff';
    ctx.fillText('● CLASS A (+1)', 14, 24); ctx.fillStyle = '#ff4060';
    ctx.fillText('● CLASS B (−1)', 14, 44);
    ctx.font = 'bold 10px Barlow Condensed'; ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillText(svmType === 'linear' ? 'LINEAR SVM' : 'NON-LINEAR SVM (RBF KERNEL)', W - 150, H - 10);
  };

  // ----- MOUSE HANDLERS -----
  const handleMouseDown = (e) => {
    if (phase !== 'playing') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top) * (H / rect.height);
    if (svmType === 'linear') {
      setUserLineX(x);
      evaluateUser(x, null);
    } else {
      setIsDrawingCircle(true);
      setTempCircle({ cx: x, cy: y, r: 0 });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawingCircle || phase !== 'playing') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top) * (H / rect.height);
    if (tempCircle) {
      const r = Math.hypot(x - tempCircle.cx, y - tempCircle.cy);
      setTempCircle({ ...tempCircle, r });
    }
  };

  const handleMouseUp = () => {
    if (isDrawingCircle && tempCircle && tempCircle.r > 5) {
      setUserCircle(tempCircle);
      setTempCircle(null);
      setIsDrawingCircle(false);
      evaluateUser(null, tempCircle);
    } else {
      setTempCircle(null);
      setIsDrawingCircle(false);
    }
  };

  // ----- TOUCH HANDLERS -----
  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch || phase !== 'playing') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (touch.clientX - rect.left) * (W / rect.width);
    const y = (touch.clientY - rect.top) * (H / rect.height);
    if (svmType === 'linear') {
      setUserLineX(x);
      evaluateUser(x, null);
    } else {
      setIsDrawingCircle(true);
      setTempCircle({ cx: x, cy: y, r: 0 });
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (!isDrawingCircle || phase !== 'playing') return;
    const touch = e.touches[0];
    if (!touch) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (touch.clientX - rect.left) * (W / rect.width);
    const y = (touch.clientY - rect.top) * (H / rect.height);
    if (tempCircle) {
      const r = Math.hypot(x - tempCircle.cx, y - tempCircle.cy);
      setTempCircle({ ...tempCircle, r });
    }
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    if (isDrawingCircle && tempCircle && tempCircle.r > 5) {
      setUserCircle(tempCircle);
      setTempCircle(null);
      setIsDrawingCircle(false);
      evaluateUser(null, tempCircle);
    } else {
      setTempCircle(null);
      setIsDrawingCircle(false);
    }
  };

  // ----- RESET & SHOW SVM (unchanged) -----
  const resetGame = () => {
    setUserLineX(null); setUserCircle(null); setSvmData(null); setPhase('learn');
    setUserMargin(null); setScorePct(null); setResultMsg(''); setComparisonMsg('');
    setUserValid(false); setShowSolutionBtn(false); setTempCircle(null); setIsDrawingCircle(false);
    setStatusText(svmType === 'rbf' ? '🔮 Tap & drag to draw a circle!' : '👆 Tap "Start Playing" — then tap to draw a line');
    setPhaseTag(svmType === 'rbf' ? 'KERNEL MODE' : 'LEARN MODE');
    const newPts = generatePoints();
    computeSVM(newPts);
  };

  const showSVM = () => {
    setPhase('svm'); setShowSolutionBtn(false);
    setStatusText(svmType === 'rbf' ? '🟢 Optimal circle = RBF Kernel SVM' : '🟢 Green = SVM optimal hyperplane');
    setPhaseTag('SVM SOLUTION');

    if (svmType === 'rbf') {
      setComparisonMsg('🔮 RBF Kernel maps data to higher dimension. The circle in 2D is a plane in 3D!');
      setResultMsg('Non-linear SVM wins!');
    } else {
      if (!userValid) {
        setComparisonMsg('❌ Your line misclassified points! SVM ensures ALL points are on the correct side.');
      } else if (userMargin > 0) {
        const diff = svmMargin - userMargin;
        if (userLineX < svmData.x) {
          setComparisonMsg(`📊 Your line is too far LEFT. SVM moves it RIGHT, increasing margin by ${diff}px.`);
        } else {
          setComparisonMsg(`📊 Your line is too far RIGHT. SVM moves it LEFT, increasing margin by ${diff}px.`);
        }
        const imp = Math.round(((svmMargin - userMargin) / userMargin) * 100);
        setResultMsg(`SVM margin is ${imp}% wider!`);
      } else {
        setComparisonMsg('🎯 Perfect! Your line matches the SVM optimal hyperplane.');
        setResultMsg('🏆 Optimal solution!');
      }
    }
  };

  const switchType = (t) => { setSvmType(t); resetGame(); };

  useEffect(() => {
    const upd = () => { if (canvasRef.current) setDimensions({ width: canvasRef.current.parentElement.clientWidth, height: 420 }); };
    upd(); window.addEventListener('resize', upd); return () => window.removeEventListener('resize', upd);
  }, []);

  useEffect(() => {
    if (W > 0) { const pts = generatePoints(); computeSVM(pts); }
  }, [W, difficulty, svmType]);

  useEffect(() => { drawCanvas(); }, [points, userLineX, userCircle, tempCircle, svmData, phase, W, userValid, svmType]);

  // ----- RESPONSIVE STYLES -----
  const headerPadding = isMobile ? '10px 12px' : '14px 28px';
  const headerFlexDir = isMobile ? 'column' : 'row';
  const headerGap = isMobile ? '8px' : '10px';
  const logoFontSize = isMobile ? '22px' : '26px';
  const controlsWrap = isMobile ? 'wrap' : 'nowrap';
  const buttonPadding = isMobile ? '7px 12px' : '9px 20px';
  const selectPadding = isMobile ? '7px 10px' : '9px 14px';
  const canvasContainerPadding = isMobile ? '12px 12px' : '20px 28px';
  const scoreFlexDir = isMobile ? 'column' : 'row';
  const scoreGap = isMobile ? '8px' : '10px';
  const scoreFontSize = isMobile ? '22px' : '28px';
  const resultBarFlexDir = isMobile ? 'column' : 'row';
  const resultBarAlign = isMobile ? 'flex-start' : 'center';
  const resultBarGap = isMobile ? '10px' : '0';

  return (
    <div style={{ minHeight: '100vh', background: '#07080f', color: '#f0eee8', fontFamily: 'Barlow, sans-serif' }}>
      {/* Responsive Header */}
      <div style={{
        background: 'rgba(7,8,15,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: headerPadding,
        display: 'flex',
        flexDirection: headerFlexDir,
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'space-between',
        gap: headerGap
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'linear-gradient(135deg, rgba(0,229,192,0.2), rgba(0,229,192,0.05))',
            border: '1px solid rgba(0,229,192,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18
          }}>🎯</div>
          <div>
            <h1 style={{ fontFamily: 'Barlow Condensed', fontWeight: 900, fontSize: logoFontSize, margin: 0 }}>
              Margin <span style={{ color: '#00e5c0' }}>Master</span>
            </h1>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>SVM Demo · by Teena</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: controlsWrap }}>
          <select value={svmType} onChange={e => switchType(e.target.value)} style={{
            background: '#1e1f2e', color: '#f0eee8',
            border: '1px solid rgba(255,255,255,0.07)',
            padding: selectPadding, borderRadius: 8, fontSize: 13, fontWeight: 500,
            flex: isMobile ? '1 1 40%' : 'none'
          }}>
            <option value="linear">📏 Linear</option>
            <option value="rbf">🔮 RBF</option>
          </select>
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={{
            background: '#1e1f2e', color: '#f0eee8',
            border: '1px solid rgba(255,255,255,0.07)',
            padding: selectPadding, borderRadius: 8, fontSize: 13,
            flex: isMobile ? '1 1 40%' : 'none'
          }}>
            <option value="easy">🌟 Easy</option>
            <option value="medium">🔥 Medium</option>
            <option value="hard">💪 Hard</option>
          </select>
          <button onClick={resetGame} style={{
            background: '#1e1f2e', color: '#f0eee8',
            border: '1px solid rgba(255,255,255,0.07)',
            padding: buttonPadding, borderRadius: 8, fontSize: 13, fontWeight: 600,
            flex: isMobile ? '1 1 30%' : 'none'
          }}>↺ New</button>
          <button onClick={() => { if (phase === 'learn') { setPhase('playing'); setStatusText(svmType === 'rbf' ? '🎯 Tap & drag to draw a circle!' : '🎯 Tap canvas to draw a line!'); setPhaseTag('DRAWING MODE'); } }} style={{
            background: phase === 'learn' ? '#00e5c0' : '#1e1f2e',
            color: phase === 'learn' ? '#000' : '#f0eee8',
            border: 'none',
            padding: buttonPadding, borderRadius: 8, fontSize: 13, fontWeight: 600,
            flex: isMobile ? '1 1 40%' : 'none'
          }}>
            {phase === 'learn' ? '▶ Start' : 'Drawing...'}
          </button>
        </div>
      </div>

      <div style={{ padding: canvasContainerPadding, maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ background: '#0f1018', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ position: 'relative' }}>
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { setIsDrawingCircle(false); setTempCircle(null); }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={() => { setIsDrawingCircle(false); setTempCircle(null); }}
              style={{ display: 'block', width: '100%', cursor: 'crosshair', touchAction: 'none' }}
            />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: isMobile ? '8px 12px' : '10px 16px',
              background: 'linear-gradient(transparent, rgba(7,8,15,0.95))',
              display: 'flex', justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: 11, color: '#6b7280' }}>{statusText}</span>
              <span style={{ fontFamily: 'Space Mono', fontSize: 10, color: '#00e5c0' }}>{phaseTag}</span>
            </div>
          </div>

          {/* Score row - stacks on mobile */}
          <div style={{ display: 'flex', flexDirection: scoreFlexDir, gap: scoreGap, padding: isMobile ? '10px 12px' : '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ flex: 1, background: '#161720', borderRadius: 8, padding: isMobile ? '8px 10px' : '10px 14px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: scoreFontSize, color: userValid ? '#ffd166' : '#ff4060' }}>{userMargin !== null ? userMargin : '—'}</div>
              <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>Your Margin</div>
            </div>
            <div style={{ flex: 1, background: '#161720', borderRadius: 8, padding: isMobile ? '8px 10px' : '10px 14px', border: '1px solid rgba(0,229,192,0.3)', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: scoreFontSize, color: '#00e5c0' }}>{svmMargin !== null ? svmMargin : '—'}</div>
              <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>SVM Margin</div>
            </div>
            <div style={{ flex: 1, background: '#161720', borderRadius: 8, padding: isMobile ? '8px 10px' : '10px 14px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: scoreFontSize, color: '#f0eee8' }}>{scorePct !== null ? scorePct + '%' : '—'}</div>
              <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>Score</div>
            </div>
          </div>

          {/* Result bar */}
          {showSolutionBtn && (
            <div style={{
              padding: isMobile ? '10px 12px' : '12px 16px',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              display: 'flex',
              flexDirection: resultBarFlexDir,
              alignItems: resultBarAlign,
              gap: resultBarGap,
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: svmType === 'rbf' ? '#a78bfa' : (scorePct >= 90 ? '#22c55e' : scorePct >= 65 ? '#ffd166' : '#ff4060') }}>{resultMsg}</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={showSVM} style={{
                  background: svmType === 'rbf' ? 'rgba(167,139,250,0.15)' : 'rgba(77,166,255,0.15)',
                  color: svmType === 'rbf' ? '#a78bfa' : '#4da6ff',
                  border: svmType === 'rbf' ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(77,166,255,0.3)',
                  padding: buttonPadding, borderRadius: 8, fontSize: 13, fontWeight: 600
                }}>
                  {svmType === 'rbf' ? '🔮 Show Kernel SVM' : '🤖 Show SVM Solution'}
                </button>
                <button onClick={resetGame} style={{
                  background: '#1e1f2e', color: '#f0eee8',
                  border: '1px solid rgba(255,255,255,0.07)',
                  padding: buttonPadding, borderRadius: 8, fontSize: 13, fontWeight: 600
                }}>↺ Try Again</button>
              </div>
            </div>
          )}

          {phase === 'svm' && comparisonMsg && (
            <div style={{
              padding: isMobile ? '10px 12px' : '12px 16px',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              background: svmType === 'rbf' ? 'rgba(167,139,250,0.05)' : 'rgba(0,229,192,0.05)'
            }}>
              <p style={{ fontSize: 13, color: svmType === 'rbf' ? '#a78bfa' : '#00e5c0', margin: 0, lineHeight: 1.6 }}>{comparisonMsg}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarginMaster;
