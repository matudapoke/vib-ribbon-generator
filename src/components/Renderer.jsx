import React, { useRef, useEffect } from 'react';

const Renderer = ({ polylines, jitterAmount = 2, jitterSpeed = 60, width = 800, height = 600 }) => {
    const canvasRef = useRef(null);
    const requestRef = useRef();
    const lastUpdateRef = useRef(0);

    const draw = (time) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Throttle updates based on jitterSpeed
        const interval = 1000 / jitterSpeed;
        if (time - lastUpdateRef.current < interval) {
            requestRef.current = requestAnimationFrame(draw);
            return;
        }
        lastUpdateRef.current = time;

        const ctx = canvas.getContext('2d');

        // Clear canvas
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);

        if (!polylines || polylines.length === 0) return;

        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        polylines.forEach(line => {
            if (line.length < 2) return;

            ctx.beginPath();

            // Move to first point with jitter
            const startX = line[0].x + (Math.random() - 0.5) * jitterAmount;
            const startY = line[0].y + (Math.random() - 0.5) * jitterAmount;
            ctx.moveTo(startX, startY);

            for (let i = 1; i < line.length; i++) {
                const x = line[i].x + (Math.random() - 0.5) * jitterAmount;
                const y = line[i].y + (Math.random() - 0.5) * jitterAmount;
                ctx.lineTo(x, y);
            }

            ctx.closePath();
            ctx.stroke();
        });

        requestRef.current = requestAnimationFrame(draw);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(requestRef.current);
    }, [polylines, jitterAmount, jitterSpeed, width, height]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="renderer-canvas"
            style={{ border: '1px solid #333', maxWidth: '100%', height: 'auto' }}
        />
    );
};

export default Renderer;
