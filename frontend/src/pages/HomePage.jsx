import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { DndContext, DragOverlay, closestCorners, useSensor, useSensors, PointerSensor, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion } from 'framer-motion'
import { Plus, Search, ArrowLeft, Lock, Globe } from 'lucide-react'
import TaskCard from '../components/board/TaskCard'
import NewTaskModal from '../components/NewTaskModal'
import { io } from 'socket.io-client'

const COLUMNS = [
    { id: 'Backlog', title: 'Backlog', color: 'bg-gray-500/20' },
    { id: 'Todo', title: 'To Do', color: 'bg-blue-500/20' },
    { id: 'In Progress', title: 'In Progress', color: 'bg-purple-500/20' },
    { id: 'Done', title: 'Done', color: 'bg-emerald-500/20' }
]

const Column = ({ col, tasks, setIsModalOpen }) => {
    const { setNodeRef } = useDroppable({ id: col.id })
    return (
        <div ref={setNodeRef} className="bg-[#0f0f12] rounded-2xl p-4 flex flex-col h-full border border-white/5 min-w-[280px]">
            <div className="flex justify-between items-center mb-4 px-2">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${col.color.replace('/20', '')}`} />
                    <h3 className="font-medium text-gray-200">{col.title}</h3>
                </div>
                <Plus onClick={() => setIsModalOpen(true)} className="w-4 h-4 text-gray-500 cursor-pointer hover:text-white" />
            </div>
            <SortableContext items={tasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 min-h-[100px]">
                    {tasks.map(task => <TaskCard key={task._id} task={task} />)}
                </div>
            </SortableContext>
        </div>
    )
}

const HomePage = () => {
    const { roomId } = useParams()
    const isPersonal = roomId === 'personal'
    const [tasks, setTasks] = useState([])
    const [activeId, setActiveId] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

    useEffect(() => {
        fetchTasks()
        const socket = io('http://localhost:3000')

        socket.on('taskCreated', (newTask) => {
            console.log("Received socket taskCreated:", newTask);
            if (isPersonal && !newTask.room) {
                setTasks(prev => [newTask, ...prev])
            } else if (newTask.room === roomId) {
                setTasks(prev => [newTask, ...prev])
            }
        })

        socket.on('taskUpdated', (updatedTask) => {
            if (isPersonal && !updatedTask.room) setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t))
            else if (updatedTask.room === roomId) setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t))
        })

        socket.on('taskDeleted', ({ id, roomId: taskRoomId }) => {
            const match = isPersonal ? (taskRoomId === 'personal' || !taskRoomId) : taskRoomId === roomId
            if (match) setTasks(prev => prev.filter(t => t._id !== id))
        })

        return () => socket.disconnect()
    }, [roomId, isPersonal])

    const fetchTasks = async () => {
        try {
            const res = await fetch(`http://localhost:3000/api/tasks?roomId=${roomId}`, { credentials: 'include' })
            const data = await res.json()
            if (data.success) setTasks(data.tasks)
        } catch (err) { console.error(err) }
    }

    const handleCreateTask = async (taskData) => {
        try {
            const res = await fetch('http://localhost:3000/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...taskData, roomId }),
                credentials: 'include'
            })
            const data = await res.json()
            if (res.ok) {
                setIsModalOpen(false)
            } else {
                console.error("Server Error creating task:", data.message)
                alert("Error: " + data.message)
            }
        } catch (err) {
            console.error("Fetch Error creating task:", err)
            alert("Connection Error")
        }
    }

    const handleDragEnd = async (event) => {
        const { active, over } = event
        if (!over) return
        const activeTask = tasks.find(t => t._id === active.id)
        const overId = over.id
        let newStatus = activeTask.status
        if (COLUMNS.find(c => c.id === overId)) newStatus = overId
        else {
            const overTask = tasks.find(t => t._id === overId)
            if (overTask) newStatus = overTask.status
        }

        if (activeTask.status !== newStatus) {
            setTasks(prev => prev.map(t => t._id === active.id ? { ...t, status: newStatus } : t))
            await fetch(`http://localhost:3000/api/tasks/${active.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
                credentials: 'include'
            })
        }
        setActiveId(null)
    }

    return (
        <div className="min-h-screen bg-[#030305] text-white p-8">
            <header className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <Link to="/rooms" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><ArrowLeft className="w-5 h-5 text-gray-400" /></Link>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {isPersonal ? <Lock className="w-4 h-4 text-indigo-400" /> : <Globe className="w-4 h-4 text-purple-400" />}
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
                                {isPersonal ? 'My Private Space' : 'Class Board'}
                            </h1>
                        </div>
                        <p className="text-gray-400 text-sm">{isPersonal ? 'Only you can see these tasks' : 'Collaborative board for the class'}</p>
                    </div>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all font-bold">New Task</button>
            </header>

            <NewTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleCreateTask} />

            <DndContext sensors={useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))} collisionDetection={closestCorners} onDragStart={(e) => setActiveId(e.active.id)} onDragEnd={handleDragEnd}>
                <div className="flex gap-6 h-[calc(100vh-180px)] overflow-x-auto pb-4 custom-scrollbar">
                    {COLUMNS.map(col => <Column key={col.id} col={col} tasks={tasks.filter(t => t.status === col.id)} setIsModalOpen={setIsModalOpen} />)}
                </div>
                <DragOverlay>{activeId ? <TaskCard task={tasks.find(t => t._id === activeId)} /> : null}</DragOverlay>
            </DndContext>
        </div>
    )
}

export default HomePage